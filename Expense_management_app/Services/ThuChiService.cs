using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Expense_management_app.Data;
using Expense_management_app.Entities;
using Expense_management_app.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Expense_management_app.Services
{
    public sealed class ThuChiService : IThuChiService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ThuChiService> _logger;

        public ThuChiService(
            AppDbContext dbContext,
            ILogger<ThuChiService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<int> TaoGiaoDichAsync(
            int userId,
            int tkId,
            int danhMucId,
            string loaiGd,
            decimal soTien,
            DateTime? ngayGd,
            string? moTa,
            Guid idempotencyKey,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
                throw new ArgumentException(
                    "Người dùng không hợp lệ.");

            if (idempotencyKey == Guid.Empty)
                throw new ArgumentException(
                    "Idempotency-Key không hợp lệ.");

            if (tkId <= 0 || danhMucId <= 0)
                throw new ArgumentException(
                    "Tài khoản hoặc danh mục không hợp lệ.");

            loaiGd = loaiGd?.Trim().ToLowerInvariant()
                ?? string.Empty;

            if (loaiGd != "thu" && loaiGd != "chi")
                throw new ArgumentException(
                    "Loại giao dịch chỉ được là 'thu' hoặc 'chi'.");

            if (soTien <= 0
                || soTien > 9999999999999999.99m
                || decimal.Round(soTien, 2) != soTien)
            {
                throw new ArgumentException(
                    "Số tiền không hợp lệ.");
            }

            moTa = moTa?.Trim();

            if (moTa != null && moTa.Length > 250)
                throw new ArgumentException(
                    "Mô tả không được vượt quá 250 ký tự.");

            string key = idempotencyKey.ToString("D");

            string requestHash = TaoRequestHash(
                userId,
                tkId,
                danhMucId,
                loaiGd,
                soTien,
                ngayGd,
                moTa);

            // Nếu đã xử lý request này, trả lại kết quả cũ.
            var existingBeforeTransaction =
                await TimGiaoDichAsync(
                    userId, key, cancellationToken);

            if (existingBeforeTransaction != null)
            {
                return LayKetQuaCu(
                    existingBeforeTransaction,
                    requestHash,
                    userId,
                    idempotencyKey);
            }

            DateTime now = DateTime.UtcNow;
            DateTime ngayGiaoDich =
                ngayGd?.ToUniversalTime() ?? now;

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    cancellationToken);

            try
            {
                var account = await _dbContext.TaiKhoans
                    .SingleOrDefaultAsync(
                        x => x.TkId == tkId
                             && x.UserId == userId,
                        cancellationToken);

                if (account == null)
                    throw new InvalidOperationException(
                        "Không tìm thấy tài khoản thuộc người dùng.");

                if (!account.TrangThai)
                    throw new InvalidOperationException(
                        "Tài khoản đã bị khóa.");

                var category = await _dbContext.DanhMucs
                    .SingleOrDefaultAsync(
                        x => x.DanhMucId == danhMucId
                             && x.UserId == userId
                             && x.TrangThai,
                        cancellationToken);

                if (category == null)
                    throw new InvalidOperationException(
                        "Không tìm thấy danh mục thuộc người dùng.");

                if (!string.Equals(
                    category.LoaiGd,
                    loaiGd,
                    StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Loại giao dịch không khớp với danh mục.");
                }

                if (loaiGd == "chi")
                {
                    if (account.SoDuHienTai < soTien)
                        throw new InvalidOperationException(
                            "Số dư tài khoản không đủ.");

                    account.SoDuHienTai -= soTien;
                }
                else
                {
                    const decimal maxBalance =
                        9999999999999999.99m;

                    if (account.SoDuHienTai > maxBalance - soTien)
                        throw new InvalidOperationException(
                            "Số dư sau giao dịch vượt giới hạn cho phép.");

                    account.SoDuHienTai += soTien;
                }

                var giaoDich = new GiaoDich
                {
                    UserId = userId,
                    TkId = tkId,
                    DanhMucId = danhMucId,
                    LoaiGd = loaiGd,
                    SoTien = soTien,
                    NgayGd = ngayGiaoDich,
                    NgayTao = now,
                    MoTa = moTa,
                    GiaoDichGocId = null,
                    IdempotencyKey = key,
                    RequestHash = requestHash
                };

                _dbContext.GiaoDichs.Add(giaoDich);

                await _dbContext.SaveChangesAsync(
                    cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "Ghi nhận giao dịch thành công. " +
                    "UserId={UserId}, GiaoDichId={GiaoDichId}",
                    userId,
                    giaoDich.GiaoDichId);

                return giaoDich.GiaoDichId;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                await transaction.RollbackAsync(
                    CancellationToken.None);

                _dbContext.ChangeTracker.Clear();

                var existingAfterConcurrency =
                    await TimGiaoDichAsync(
                        userId, key, cancellationToken);

                if (existingAfterConcurrency != null)
                {
                    return LayKetQuaCu(
                        existingAfterConcurrency,
                        requestHash,
                        userId,
                        idempotencyKey);
                }

                _logger.LogWarning(
                    ex,
                    "Xung đột concurrency khi ghi nhận thu chi. " +
                    "UserId={UserId}, TkId={TkId}",
                    userId,
                    tkId);

                throw new InvalidOperationException(
                    "Tài khoản vừa được cập nhật. " +
                    "Hãy tải lại số dư rồi thử lại.",
                    ex);
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync(
                    CancellationToken.None);

                _dbContext.ChangeTracker.Clear();

                var existingAfterDbError =
                    await TimGiaoDichAsync(
                        userId, key, cancellationToken);

                if (existingAfterDbError != null)
                {
                    return LayKetQuaCu(
                        existingAfterDbError,
                        requestHash,
                        userId,
                        idempotencyKey);
                }

                _logger.LogError(
                    ex,
                    "Lỗi database khi ghi nhận thu chi. " +
                    "UserId={UserId}, TkId={TkId}",
                    userId,
                    tkId);

                throw;
            }
            catch
            {
                await transaction.RollbackAsync(
                    CancellationToken.None);

                _dbContext.ChangeTracker.Clear();

                throw;
            }
        }

        private Task<GiaoDich?> TimGiaoDichAsync(
            int userId,
            string key,
            CancellationToken cancellationToken)
        {
            return _dbContext.GiaoDichs
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    x => x.UserId == userId
                         && x.IdempotencyKey == key,
                    cancellationToken);
        }

        private int LayKetQuaCu(
            GiaoDich existing,
            string requestHash,
            int userId,
            Guid idempotencyKey)
        {
            if (!string.Equals(
                existing.RequestHash,
                requestHash,
                StringComparison.Ordinal))
            {
                _logger.LogWarning(
                    "Idempotency-Key được sử dụng với payload khác. " +
                    "UserId={UserId}, GiaoDichId={GiaoDichId}",
                    userId,
                    existing.GiaoDichId);

                throw new IdempotencyConflictException(
                    "Idempotency-Key đã được sử dụng cho một yêu cầu khác.");
            }

            _logger.LogInformation(
                "Trả lại kết quả giao dịch cũ. " +
                "UserId={UserId}, GiaoDichId={GiaoDichId}",
                userId,
                existing.GiaoDichId);

            return existing.GiaoDichId;
        }

        private static string TaoRequestHash(
            int userId,
            int tkId,
            int danhMucId,
            string loaiGd,
            decimal soTien,
            DateTime? ngayGd,
            string? moTa)
        {
            string canonical = JsonSerializer.Serialize(new
            {
                userId,
                tkId,
                danhMucId,
                loaiGd,
                soTien = soTien.ToString(
                    "F2", CultureInfo.InvariantCulture),
                ngayGd = ngayGd?.ToString(
                    "O", CultureInfo.InvariantCulture),
                moTa = moTa ?? string.Empty
            });

            byte[] bytes = SHA256.HashData(
                Encoding.UTF8.GetBytes(canonical));

            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
    }
}