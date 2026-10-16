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
    [Route("api/danh-muc")]
    public class DanhMucController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public DanhMucController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyCategories(
            CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            var categories = await _dbContext.DanhMucs
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.TrangThai)
                .OrderBy(x => x.LoaiGd)
                .ThenBy(x => x.TenDanhMuc)
                .Select(x => new
                {
                    danhMucId = x.DanhMucId,
                    tenDanhMuc = x.TenDanhMuc,
                    loaiGd = x.LoaiGd
                })
                .ToListAsync(cancellationToken);

            return Ok(categories);
        }

        [HttpPost]
        public async Task<IActionResult> CreateCategory(
            [FromBody] TaoDanhMucRequest request,
            CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            string tenDanhMuc = request.TenDanhMuc.Trim();
            string loaiGd = request.LoaiGd.Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(tenDanhMuc))
            {
                return BadRequest(new
                {
                    message = "Tên danh mục không được để trống."
                });
            }

            if (loaiGd != "thu" && loaiGd != "chi")
            {
                return BadRequest(new
                {
                    message = "Loại giao dịch chỉ được là 'thu' hoặc 'chi'."
                });
            }

            var category = new DanhMuc
            {
                UserId = userId,
                TenDanhMuc = tenDanhMuc,
                LoaiGd = loaiGd,
                TrangThai = true
            };

            _dbContext.DanhMucs.Add(category);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return StatusCode(201, new
            {
                danhMucId = category.DanhMucId,
                tenDanhMuc = category.TenDanhMuc,
                loaiGd = category.LoaiGd
            });
        }
    }
}