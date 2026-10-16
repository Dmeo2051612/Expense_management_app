using System;
using System.ComponentModel.DataAnnotations;

namespace Expense_management_app.Contracts
{
    public class TaoNganSachRequest
    {
        [Range(1, int.MaxValue)]
        public int DanhMucId { get; set; }

        [Range(
            typeof(decimal),
            "0.01",
            "9999999999999999.99")]
        public decimal SoTienGioiHan { get; set; }

        [Required]
        public DateTime? TuNgay { get; set; }

        [Required]
        public DateTime? DenNgay { get; set; }
    }
}