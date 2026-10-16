using System;

namespace Expense_management_app.Contracts
{
    public class ChuyenKhoanHistoryResponse
    {
        public int ChuyenKhoanId { get; set; }

        public int TkNguonId { get; set; }

        public string TenTkNguon { get; set; } = string.Empty;

        public int TkDichId { get; set; }

        public string TenTkDich { get; set; } = string.Empty;

        public decimal SoTien { get; set; }

        public DateTime NgayTao { get; set; }

        public string? MoTa { get; set; }
    }
}