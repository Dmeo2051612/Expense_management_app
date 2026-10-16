using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Expense_management_app.Entities
{
    [Table("ngan_sach")]
    public class NganSach
    {
        [Key]
        [Column("ngansach_id")]
        public int NganSachId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("danhmuc_id")]
        public int DanhMucId { get; set; }

        [Column("sotien_gioihan", TypeName = "decimal(18,2)")]
        public decimal SoTienGioiHan { get; set; }

        [Column("tu_ngay")]
        public DateTime TuNgay { get; set; }

        [Column("den_ngay")]
        public DateTime DenNgay { get; set; }
    }
}