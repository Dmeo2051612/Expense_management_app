using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace Expense_management_app.Contracts
{
    public class ChuyenTienRequest
    {
        [Range(1, int.MaxValue)]
        public int TkNguonId { get; set; }

        [Range(1, int.MaxValue)]
        public int TkDichId { get; set; }
            
        [Range(typeof(decimal), "0.01", "9999999999999999.99")]    
        public decimal SoTien {  get; set; }

        [StringLength(250)]
        public string? MoTa {  get; set; }
    }
}
