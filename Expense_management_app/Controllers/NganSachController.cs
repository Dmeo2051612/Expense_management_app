using System.Security.Claims;
using Expense_management_app.Contracts;
using Expense_management_app.Data;
using Expense_management_app.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expense_management_app.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/ngan-sach")]
    public class NganSachController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public NganSachController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyBudgets(
            CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            var budgets = await _dbContext.NganSachs
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.TuNgay)
                .Select(x => new
                {
                    x.NganSachId,
                    x.DanhMucId,

                    TenDanhMuc = _dbContext.DanhMucs
                        .Where(d =>
                            d.DanhMucId == x.DanhMucId &&
                            d.UserId == userId)
                        .Select(d => d.TenDanhMuc)
                        .FirstOrDefault() ?? string.Empty,

                    x.SoTienGioiHan,
                    x.TuNgay,
                    x.DenNgay,

                    SoTienDaChi = _dbContext.GiaoDichs
                        .Where(g =>
                            g.UserId == userId &&
                            g.DanhMucId == x.DanhMucId &&
                            g.LoaiGd == "chi" &&
                            g.NgayGd >= x.TuNgay &&
                            g.NgayGd < x.DenNgay.AddDays(1))
                        .Select(g => (decimal?)g.SoTien)
                        .Sum() ?? 0m
                })
                .ToListAsync(cancellationToken);

            var result = budgets.Select(x => new
            {
                x.NganSachId,
                x.DanhMucId,
                x.TenDanhMuc,
                x.SoTienGioiHan,
                TuNgay = x.TuNgay.ToString("yyyy-MM-dd"),
                DenNgay = x.DenNgay.ToString("yyyy-MM-dd"),
                x.SoTienDaChi,
                SoTienConLai = x.SoTienGioiHan - x.SoTienDaChi,
                VuotNganSach = x.SoTienDaChi > x.SoTienGioiHan
            });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateBudget(
            [FromBody] TaoNganSachRequest request,
            CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            if (!request.TuNgay.HasValue ||
                !request.DenNgay.HasValue)
            {
                return BadRequest(new
                {
                    message = "Vui lòng cung cấp ngày bắt đầu và ngày kết thúc."
                });
            }

            DateTime tuNgay = request.TuNgay.Value.Date;
            DateTime denNgay = request.DenNgay.Value.Date;

            if (denNgay < tuNgay)
            {
                return BadRequest(new
                {
                    message = "Ngày kết thúc phải từ ngày bắt đầu trở đi."
                });
            }

            var category = await _dbContext.DanhMucs
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    x => x.DanhMucId == request.DanhMucId
                         && x.UserId == userId
                         && x.TrangThai,
                    cancellationToken);

            if (category == null || category.LoaiGd != "chi")
            {
                return BadRequest(new
                {
                    message = "Danh mục ngân sách phải là danh mục chi tiêu hợp lệ của bạn."
                });
            }

            var budget = new NganSach
            {
                UserId = userId,
                DanhMucId = request.DanhMucId,
                SoTienGioiHan = request.SoTienGioiHan,
                TuNgay = tuNgay,
                DenNgay = denNgay
            };

            _dbContext.NganSachs.Add(budget);

            await _dbContext.SaveChangesAsync(cancellationToken);

            return StatusCode(201, new
            {
                nganSachId = budget.NganSachId,
                danhMucId = budget.DanhMucId,
                tenDanhMuc = category.TenDanhMuc,
                soTienGioiHan = budget.SoTienGioiHan,
                tuNgay = budget.TuNgay.ToString("yyyy-MM-dd"),
                denNgay = budget.DenNgay.ToString("yyyy-MM-dd")
            });
        }
    }
}