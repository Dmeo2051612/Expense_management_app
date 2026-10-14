using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Expense_management_app.Entities
{
    [Table("chuyen_khoan")]
    public class ChuyenKhoan
    {
        [Key]
        [Column("chuyen_khoan_id")]
        public int ChuyenKhoanId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("tk_nguon_id")]
        public int TkNguonId { get; set; }

        [Column("tk_dich_id")]
        public int TkDichId { get; set; }

        [Column("so_tien", TypeName = "decimal(18, 2)")]
        public decimal SoTien { get; set; }

        [Column("ngay_tao")]
        public DateTime NgayTao { get; set; }

        [Column("mota", TypeName = "varchar(250)")]
        public string MoTa { get; set; } = string.Empty;

        [Column("idempotency_key")]
        public string IdempotencyKey { get; set; } = string.Empty;

        [Column("request_hash")]
        public string RequestHash { get; set; } = string.Empty;
    }
}