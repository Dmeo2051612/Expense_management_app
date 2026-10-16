using Expense_management_app.Entities;
using Microsoft.EntityFrameworkCore;

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

        public DbSet<ChuyenKhoan> ChuyenKhoans { get; set; }
            = null!;

        public DbSet<NguoiDung> NguoiDungs { get; set; }
            = null!;

        public DbSet<DanhMuc> DanhMucs { get; set; } = null!;

        public DbSet<GiaoDich> GiaoDichs { get; set; } = null!;

        public DbSet<NganSach> NganSachs { get; set; } = null!;

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

            modelBuilder.Entity<ChuyenKhoan>()
                .Property(x => x.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<ChuyenKhoan>()
                .HasIndex(x => new
                {
                    x.UserId,
                    x.IdempotencyKey
                })
                .HasDatabaseName("uq_chuyenkhoan_user_key")
                .IsUnique();                                                
        }
    }
}