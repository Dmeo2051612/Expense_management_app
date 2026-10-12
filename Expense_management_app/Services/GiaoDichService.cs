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
    public class GiaoDichService : IGiaoDichService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<GiaoDichService> _logger;

        public GiaoDichService(
            AppDbContext dbContext,
            ILogger<GiaoDichService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<int> ChuyenTienAsync(
            int userId,
            int tkNguonId,
            int tkDichId,
            decimal soTien,
            string? moTa,
            Guid idempotencyKey,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
                throw new ArgumentException("Người dùng không hợp lệ.");

            if (idempotencyKey == Guid.Empty)
                throw new ArgumentException("Idempotency-Key không hợp lệ.");

            if (tkNguonId <= 0 || tkDichId <= 0
                || tkNguonId == tkDichId)
            {
                throw new ArgumentException(
                    "Tài khoản nguồn và đích không hợp lệ.");
            }

            if (soTien <= 0
                || soTien > 9999999999999999.99m
                || decimal.Round(soTien, 2) != soTien)
            {
                throw new ArgumentException("Số tiền không hợp lệ.");
            }

            moTa = moTa?.Trim() ?? string.Empty;

            if (moTa.Length > 250)
                throw new ArgumentException("Mô tả quá dài.");

            string key = idempotencyKey.ToString("D");
            string requestHash = TaoRequestHash(
                userId, tkNguonId, tkDichId, soTien, moTa);

            // Kiểm tra nhanh trước khi mở transaction.
            var existingBeforeTransaction = await TimChuyenKhoanAsync(
                userId, key, cancellationToken);

            if (existingBeforeTransaction != null)
            {
                return LayKetQuaCu(
                    existingBeforeTransaction,
                    requestHash,
                    userId,
                    idempotencyKey);
            }

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    cancellationToken);

            try
            {
                var accounts = await _dbContext.TaiKhoans
                    .Where(x =>
                        (x.TkId == tkNguonId || x.TkId == tkDichId)
                        && x.UserId == userId)
                    .OrderBy(x => x.TkId)
                    .ToListAsync(cancellationToken);

                var tkNguon = accounts
                    .SingleOrDefault(x => x.TkId == tkNguonId);

                var tkDich = accounts
                    .SingleOrDefault(x => x.TkId == tkDichId);

                if (tkNguon == null || tkDich == null)
                    throw new InvalidOperationException(
                        "Không tìm thấy tài khoản thuộc người dùng.");

                if (!tkNguon.TrangThai || !tkDich.TrangThai)
                    throw new InvalidOperationException(
                        "Tài khoản đã bị khóa.");

                if (!string.Equals(
                    tkNguon.DonViTienTe,
                    tkDich.DonViTienTe,
                    StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Hai tài khoản phải cùng đơn vị tiền tệ.");
                }

                if (tkNguon.SoDuHienTai < soTien)
                    throw new InvalidOperationException(
                        "Số dư tài khoản nguồn không đủ.");

                tkNguon.SoDuHienTai -= soTien;
                tkDich.SoDuHienTai += soTien;

                // Version được tự tăng bởi SaveChangesInterceptor.
                var chuyenKhoan = new ChuyenKhoan
                {
                    UserId = userId,
                    TkNguonId = tkNguonId,
                    TkDichId = tkDichId,
                    SoTien = soTien,
                    MoTa = moTa,
                    IdempotencyKey = key,
                    RequestHash = requestHash
                };

                _dbContext.ChuyenKhoans.Add(chuyenKhoan);

                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "Chuyen tien thanh cong. UserId={UserId}, " +
                    "ChuyenKhoanId={ChuyenKhoanId}, " +
                    "IdempotencyKey={IdempotencyKey}",
                    userId,
                    chuyenKhoan.ChuyenKhoanId,
                    idempotencyKey);

                return chuyenKhoan.ChuyenKhoanId;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _dbContext.ChangeTracker.Clear();

                var existingAfterConcurrency = await TimChuyenKhoanAsync(
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
                    "Xung dot concurrency khi chuyen tien. UserId={UserId}, IdempotencyKey={IdempotencyKey}",
                    userId,
                    idempotencyKey);

                throw new InvalidOperationException(
                    "Tài khoản vừa được cập nhật. Hãy tải lại số dư rồi thử lại.",
                    ex);
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _dbContext.ChangeTracker.Clear();

                var existingAfterDbError = await TimChuyenKhoanAsync(
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
                    "Loi database khi chuyen tien. UserId={UserId}, IdempotencyKey={IdempotencyKey}",
                    userId,
                    idempotencyKey);

                throw;
            }
            catch (InvalidOperationException ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _dbContext.ChangeTracker.Clear();

                _logger.LogWarning(
                    "Tu choi chuyen tien. UserId={UserId}, IdempotencyKey={IdempotencyKey}, Reason={Reason}",
                    userId,
                    idempotencyKey,
                    ex.Message);

                throw;
            }

            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _dbContext.ChangeTracker.Clear();

                _logger.LogError(
                    ex,
                    "Loi khong du kien khi chuyen tien. UserId={UserId}, IdempotencyKey={IdempotencyKey}",
                    userId,
                    idempotencyKey);

                throw;
            }
        }

        private Task<ChuyenKhoan?> TimChuyenKhoanAsync(
            int userId,
            string key,
            CancellationToken cancellationToken)
        {
            return _dbContext.ChuyenKhoans
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    x => x.UserId == userId
                         && x.IdempotencyKey == key,
                    cancellationToken);
        }

        private int LayKetQuaCu(
            ChuyenKhoan existing,
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
                    "Tai su dung Idempotency-Key voi noi dung khac. " +
                    "UserId={UserId}, IdempotencyKey={IdempotencyKey}",
                    userId,
                    idempotencyKey);

                throw new IdempotencyConflictException(
                    "Idempotency-Key đã được sử dụng cho một yêu cầu khác.");
            }

            _logger.LogInformation(
                "Tra lai ket qua chuyen tien da xu ly. " +
                "UserId={UserId}, ChuyenKhoanId={ChuyenKhoanId}, " +
                "IdempotencyKey={IdempotencyKey}",
                userId,
                existing.ChuyenKhoanId,
                idempotencyKey);

            return existing.ChuyenKhoanId;
        }

        private static string TaoRequestHash(
            int userId,
            int tkNguonId,
            int tkDichId,
            decimal soTien,
            string moTa)
        {
            string amount = soTien.ToString(
                "F2", CultureInfo.InvariantCulture);

            string canonical = JsonSerializer.Serialize(new
            {
                userId,
                tkNguonId,
                tkDichId,
                soTien = amount,
                moTa
            });

            byte[] bytes = SHA256.HashData(
                Encoding.UTF8.GetBytes(canonical));

            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
    }
}