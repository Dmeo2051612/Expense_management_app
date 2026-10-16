using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Expense_management_app.Entities
{
    [Table("giao_dich")]
    public class GiaoDich
    {
        [Key]
        [Column("giaodich_id")]
        public int GiaoDichId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("tk_id")]
        public int TkId { get; set; }

        [Column("danhmuc_id")]
        public int DanhMucId { get; set; }

        [Required]
        [Column("loai_gd", TypeName = "enum('thu','chi')")]
        public string LoaiGd { get; set; } = string.Empty;

        [Column("so_tien", TypeName = "decimal(18,2)")]
        public decimal SoTien { get; set; }

        [Column("ngay_gd")]
        public DateTime NgayGd { get; set; }

        [Column("mota", TypeName = "varchar(250)")]
        public string? MoTa { get; set; }

        [Column("ngay_tao")]
        public DateTime NgayTao { get; set; }

        [Column("giaodich_goc_id")]
        public int? GiaoDichGocId { get; set; }

        [Column("idempotency_key")]
        public string? IdempotencyKey { get; set; }

        [Column("request_hash")]
        public string? RequestHash { get; set; }
    }
}