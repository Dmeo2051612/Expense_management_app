using System.ComponentModel.DataAnnotations;

namespace Expense_management_app.Contracts
{
    public class TaoTaiKhoanRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string TenTk { get; set; } = string.Empty;

        [Required]
        [StringLength(20, MinimumLength = 1)]
        public string LoaiTk { get; set; } = string.Empty;

        [Range(
            typeof(decimal),
            "0",
            "9999999999999999.99")]
        public decimal SoDuBanDau { get; set; }
    }
}