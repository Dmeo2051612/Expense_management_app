using System.ComponentModel.DataAnnotations;

namespace Expense_management_app.Contracts
{
    public class DangNhapRequest
    {
        [Required]
        [EmailAddress]
        [StringLength(254)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string MatKhau { get; set; } = string.Empty;
    }
}