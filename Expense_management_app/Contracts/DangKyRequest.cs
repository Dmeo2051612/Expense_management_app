using System.ComponentModel.DataAnnotations;

namespace Expense_management_app.Contracts
{
    public class DangKyRequest
    {
        [Required]
        [StringLength(100)]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(254)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 12)]
        public string MatKhau { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        public string SoDienThoai { get; set; } = string.Empty;
    }
}