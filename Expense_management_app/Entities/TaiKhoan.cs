using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Expense_management_app.Entities
{
    [Table("tai_khoan")]
    public class TaiKhoan
    {
        [Key]
        [Column("tk_id")]
        public int TkId {  get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Required]
        [Column("ten_tk", TypeName = "varchar(100)")]
        public string TenTk {  get; set; } = string.Empty;

        [Required]
        [Column("loai_tk", TypeName = "varchar(20)")]
        public string LoaiTk { get; set; } = string.Empty;

        [Required]

    }
}
