using System;
using System.ComponentModel.DataAnnotations;

namespace Expense_management_app.Contracts
{
    public class TaoGiaoDichRequest
    {
        [Range(1, int.MaxValue)]
        public int TkId { get; set; }

        [Range(1, int.MaxValue)]
        public int DanhMucId { get; set; }

        [Required]
        [RegularExpression(
            "^(thu|chi)$",
            ErrorMessage = "Loại giao dịch chỉ được là 'thu' hoặc 'chi'.")]
        public string LoaiGd { get; set; } = string.Empty;

        [Range(
            typeof(decimal),
            "0.01",
            "9999999999999999.99")]
        public decimal SoTien { get; set; }

        public DateTime? NgayGd { get; set; }

        [StringLength(250)]
        public string? MoTa { get; set; }
    }
}