using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Expense_management_app.Entities
{
    [Table("users")]
    public class NguoiDung
    {
        [Key]
        [Column("user_id")]
        public int UserId { get; set; }

        [Required]
        [Column("hoten", TypeName = "varchar(100)")]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        [Column("email", TypeName = "varchar(254)")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column("password_hash", TypeName = "varchar(255)")]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [Column("sdt", TypeName = "varchar(15)")]
        public string SoDienThoai { get; set; } = string.Empty;

        [Column("ngay_tao")]
        public DateTime NgayTao { get; set; }

        [Column("trangthai")]
        public bool TrangThai { get; set; } = true;
    }
}