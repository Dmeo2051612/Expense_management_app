using System.ComponentModel.DataAnnotations;

namespace Expense_management_app.Contracts
{
    public class TaoDanhMucRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string TenDanhMuc { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(thu|chi)$",
            ErrorMessage = "Loại giao dịch chỉ được là 'thu' hoặc 'chi'.")]
        public string LoaiGd { get; set; } = string.Empty;
    }
}