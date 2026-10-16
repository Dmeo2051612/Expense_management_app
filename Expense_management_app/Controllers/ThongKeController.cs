using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Expense_management_app.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;


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
        [HttpGet("theo-ngay")]
        public async Task<IActionResult> GetDailyBreakdown(
    [FromQuery] DateOnly? tuNgay,
    [FromQuery] DateOnly? denNgay,
    CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            DateOnly today = DateOnly.FromDateTime(
                DateTime.UtcNow.AddHours(7));

            DateOnly startDate = tuNgay
                ?? new DateOnly(today.Year, today.Month, 1);

            DateOnly endDate = denNgay ?? today;

            if (endDate < startDate)
            {
                return BadRequest(new
                {
                    message = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."
                });
            }

            if (endDate.DayNumber - startDate.DayNumber > 365)
            {
                return BadRequest(new
                {
                    message = "Khoảng ngày không được vượt quá 366 ngày."
                });
            }

            // Chuyển khoảng ngày Việt Nam (UTC+7) sang UTC
            // để lọc dữ liệu giao dịch trong MySQL.
            DateTime startUtc = DateTime.SpecifyKind(
                startDate.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Unspecified).AddHours(-7);

            DateTime endUtcExclusive = DateTime.SpecifyKind(
                endDate.AddDays(1).ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Unspecified).AddHours(-7);

            var transactions = await _dbContext.GiaoDichs
                .AsNoTracking()
                .Where(x =>
                    x.UserId == userId &&
                    x.NgayGd >= startUtc &&
                    x.NgayGd < endUtcExclusive)
                .Select(x => new
                {
                    x.NgayGd,
                    x.LoaiGd,
                    x.SoTien
                })
                .ToListAsync(cancellationToken);

            var dailyTotals = transactions
                .GroupBy(x => new
                {
                    Ngay = DateOnly.FromDateTime(
                        DateTime.SpecifyKind(
                            x.NgayGd,
                            DateTimeKind.Utc).AddHours(7)),
                    x.LoaiGd
                })
                .ToDictionary(
                    group => (group.Key.Ngay, group.Key.LoaiGd),
                    group => group.Sum(x => x.SoTien));

            var result = new List<object>();

            for (DateOnly date = startDate;
                 date <= endDate;
                 date = date.AddDays(1))
            {
                dailyTotals.TryGetValue((date, "thu"), out decimal tongThu);
                dailyTotals.TryGetValue((date, "chi"), out decimal tongChi);

                result.Add(new
                {
                    ngay = date.ToString("yyyy-MM-dd"),
                    tongThu,
                    tongChi
                });
            }

            return Ok(result);
        }
    }
}