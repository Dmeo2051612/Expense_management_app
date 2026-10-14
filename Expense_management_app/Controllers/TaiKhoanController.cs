using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Expense_management_app.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Expense_management_app.Controllers
{
    [ApiController]
    [Route("api/tai-khoan")]
    [Authorize]
    public sealed class TaiKhoanController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<TaiKhoanController> _logger;

        public TaiKhoanController(
            AppDbContext dbContext,
            ILogger<TaiKhoanController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<List<TaiKhoanResponse>>> GetMyAccounts(
            CancellationToken cancellationToken)
        {
            string? userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(userIdClaim, out int userId) || userId <= 0)
            {
                _logger.LogWarning(
                    "JWT không chứa user id hợp lệ khi yêu cầu danh sách tài khoản.");

                return Unauthorized();
            }

            var accounts = await _dbContext.TaiKhoans
                .AsNoTracking()
                .Where(account =>
                    account.UserId == userId && account.TrangThai)
                .OrderBy(account => account.TkId)
                .Select(account => new TaiKhoanResponse
                {
                    TkId = account.TkId,
                    TenTk = account.TenTk,
                    LoaiTk = account.LoaiTk,
                    SoDuHienTai = account.SoDuHienTai,
                    DonViTienTe = account.DonViTienTe,
                    NgayTao = account.NgayTao
                })
                .ToListAsync(cancellationToken);

            _logger.LogInformation(
                "Đã tải danh sách tài khoản cho user {UserId}. Số lượng={AccountCount}",
                userId,
                accounts.Count);

            return Ok(accounts);
        }
    }

    public sealed class TaiKhoanResponse
    {
        public int TkId { get; set; }
        public string TenTk { get; set; } = string.Empty;
        public string LoaiTk { get; set; } = string.Empty;
        public decimal SoDuHienTai { get; set; }
        public string DonViTienTe { get; set; } = string.Empty;
        public DateTime NgayTao { get; set; }
    }
}
