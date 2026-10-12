using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Expense_management_app.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Expense_management_app.Interceptors
{
    public sealed class TaiKhoanVersionInterceptor : SaveChangesInterceptor
    {
        private static void TangVersion(DbContext? context)
        {
            if (context == null) 
                return;

            foreach (var entry in context.ChangeTracker
                            .Entries<TaiKhoan>()
                            .Where(x => x.State == EntityState.Modified))
            {
                var version = entry.Property(x => x.Version);

                version.CurrentValue = checked(version.OriginalValue + 1);

                version.IsModified = true;
            }
        }

        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData,
            InterceptionResult<int> result)
        {
            TangVersion(eventData.Context);
            return result;
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            TangVersion(eventData.Context);
            return ValueTask.FromResult(result);
        }
    }
}
