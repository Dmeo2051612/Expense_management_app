using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Expense_management_app.Entities
{
    [Table("danh_muc")]
    public class DanhMuc
    {
        [Key]
        [Column("danhmuc_id")]
        public int DanhMucId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Required]
        [Column("ten_danhmuc", TypeName = "varchar(100)")]
        public string TenDanhMuc { get; set; } = string.Empty;

        [Required]
        [Column("loai_gd", TypeName = "enum('thu','chi')")]
        public string LoaiGd { get; set; } = string.Empty;

        [Column("trangthai")]
        public bool TrangThai { get; set; } = true;
    }
}