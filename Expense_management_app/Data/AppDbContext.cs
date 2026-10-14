using Expense_management_app.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace Expense_management_app.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(
            DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<TaiKhoan> TaiKhoans { get; set; }
            = null!;

        //public DbSet<ChuyenKhoan> ChuyenKhoans { get; set; }
        //    = null!;

        protected override void OnModelCreating(
    ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder); 

            modelBuilder.Entity<TaiKhoan>()
                .Property(x => x.Version)
                .IsConcurrencyToken();

            modelBuilder.Entity<TaiKhoan>()
                .Property(x => x.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .ValueGeneratedOnAdd();
        }
    }
}