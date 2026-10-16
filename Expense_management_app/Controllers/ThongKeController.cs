using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Expense_management_app.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expense_management_app.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/thong-ke")]
    public class ThongKeController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public ThongKeController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet("tong-quan")]
        public async Task<IActionResult> GetOverview(
            [FromQuery] DateOnly? tuNgay,
            [FromQuery] DateOnly? denNgay,
            CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            DateTime gioVietNam = DateTime.UtcNow.AddHours(7);

            DateOnly ngayHienTai = DateOnly.FromDateTime(gioVietNam);

            DateOnly startDate = tuNgay
                ?? new DateOnly(
                    ngayHienTai.Year,
                    ngayHienTai.Month,
                    1);

            DateOnly endDate = denNgay ?? ngayHienTai;

            if (endDate < startDate)
            {
                return BadRequest(new
                {
                    message = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."
                });
            }

            if (endDate == DateOnly.MaxValue)
            {
                return BadRequest(new
                {
                    message = "Ngày kết thúc không hợp lệ."
                });
            }

            // Ngày đầu và ngày cuối do người dùng chọn được hiểu
            // theo giờ Việt Nam (UTC+7); dữ liệu trong DB là UTC.
            DateTime startUtc = DateTime.SpecifyKind(
                startDate.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Unspecified).AddHours(-7);

            DateTime endUtcExclusive = DateTime.SpecifyKind(
                endDate.AddDays(1).ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Unspecified).AddHours(-7);

            var query = _dbContext.GiaoDichs
                .AsNoTracking()
                .Where(x =>
                    x.UserId == userId &&
                    x.NgayGd >= startUtc &&
                    x.NgayGd < endUtcExclusive);

            decimal tongThu = await query
                .Where(x => x.LoaiGd == "thu")
                .Select(x => (decimal?)x.SoTien)
                .SumAsync(cancellationToken) ?? 0m;

            decimal tongChi = await query
                .Where(x => x.LoaiGd == "chi")
                .Select(x => (decimal?)x.SoTien)
                .SumAsync(cancellationToken) ?? 0m;

            int soGiaoDich = await query.CountAsync(
                cancellationToken);

            return Ok(new
            {
                tuNgay = startDate.ToString("yyyy-MM-dd"),
                denNgay = endDate.ToString("yyyy-MM-dd"),
                tongThu,
                tongChi,
                chenhLech = tongThu - tongChi,
                soGiaoDich
            });
        }
    }
}