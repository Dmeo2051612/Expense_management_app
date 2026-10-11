using Expense_management_app.Data;
using Expense_management_app.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace ExpenseManagementApp.Services
{
    public class GiaoDichService
    {
        private readonly AppDbContext _dbContext;

        public GiaoDichService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<int> ChuyenTienAsync(
            int userId,
            int tkNguonId,
            int tkDichId,
            decimal soTien,
            string moTa,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
                throw new ArgumentException("Người dùng không hợp lệ.");

            if (tkNguonId == tkDichId)
                throw new ArgumentException(
                    "Tài khoản nguồn và đích phải khác nhau.");

            if (soTien <= 0 || decimal.Round(soTien, 2) != soTien)
                throw new ArgumentException(
                    "Số tiền phải lớn hơn 0 và có tối đa 2 chữ số thập phân.");

            await using IDbContextTransaction transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    cancellationToken);

            try
            {
                var tkNguon = await _dbContext.TaiKhoans
                    .SingleOrDefaultAsync(
                        x => x.TkId == tkNguonId
                             && x.UserId == userId,
                        cancellationToken);

                var tkDich = await _dbContext.TaiKhoans
                    .SingleOrDefaultAsync(
                        x => x.TkId == tkDichId
                             && x.UserId == userId,
                        cancellationToken);

                if (tkNguon == null || tkDich == null)
                    throw new InvalidOperationException(
                        "Không tìm thấy tài khoản thuộc người dùng.");

                if (!tkNguon.TrangThai || !tkDich.TrangThai)
                    throw new InvalidOperationException(
                        "Tài khoản nguồn hoặc đích đã bị khóa.");

                if (!string.Equals(
                        tkNguon.DonViTienTe,
                        tkDich.DonViTienTe,
                        StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Hai tài khoản phải sử dụng cùng đơn vị tiền tệ.");
                }

                if (tkNguon.SoDuHienTai < soTien)
                    throw new InvalidOperationException(
                        "Số dư tài khoản nguồn không đủ.");

                tkNguon.SoDuHienTai -= soTien;
                tkDich.SoDuHienTai += soTien;

                // Tăng phiên bản để EF Core kiểm tra concurrency.
                tkNguon.Version = checked(tkNguon.Version + 1);
                tkDich.Version = checked(tkDich.Version + 1);

                var chuyenKhoan = new ChuyenKhoan
                {
                    UserId = userId,
                    TkNguonId = tkNguonId,
                    TkDichId = tkDichId,
                    SoTien = soTien,
                    MoTa = moTa ?? string.Empty
                };

                _dbContext.ChuyenKhoans.Add(ChuyenKhoan);

                await _dbContext.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                return chuyenKhoan.ChuyenKhoanId;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                await transaction.RollbackAsync(cancellationToken);

                throw new InvalidOperationException(
                    "Tài khoản vừa được cập nhật bởi một thao tác khác. "
                    + "Hãy tải lại số dư rồi thử lại.",
                    ex);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}