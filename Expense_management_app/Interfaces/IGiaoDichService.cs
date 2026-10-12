using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Expense_management_app.Interfaces
{
    public interface IGiaoDichService
    {
        Task<int> ChuyenTienAsync(
            int userId,
            int tkNguonId,
            int tkDichId,
            decimal soTien,
            string? moTa,
            Guid idempotencyKey,
            CancellationToken cancellationToken = default);
    }
}
