using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Expense_management_app.Services
{
    public class IdempotencyConflictException : Exception
    {
        public IdempotencyConflictException(string message) : base(message)
        {

        }
    }
}
