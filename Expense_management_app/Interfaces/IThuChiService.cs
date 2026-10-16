using System;
using System.Threading;
using System.Threading.Tasks;

namespace Expense_management_app.Interfaces
{
    public interface IThuChiService
    {
        Task<int> TaoGiaoDichAsync(
            int userId,
            int tkId,
            int danhMucId,
            string loaiGd,
            decimal soTien,
            DateTime? ngayGd,
            string? moTa,
            Guid idempotencyKey,
            CancellationToken cancellationToken = default);
    }
}