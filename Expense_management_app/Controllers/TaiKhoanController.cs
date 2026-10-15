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
using Expense_management_app.Contracts;
using Expense_management_app.Entities;

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

        [HttpPost]
        public async Task<IActionResult> CreateAccount(
    [FromBody] TaoTaiKhoanRequest request,
    CancellationToken cancellationToken)
        {
            string? userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(userIdClaim, out int userId)
                || userId <= 0)
            {
                return Unauthorized();
            }

            string tenTk = request.TenTk.Trim();
            string loaiTk = request.LoaiTk.Trim();

            if (string.IsNullOrWhiteSpace(tenTk)
                || string.IsNullOrWhiteSpace(loaiTk))
            {
                return BadRequest(new
                {
                    message = "Tên và loại tài khoản không được để trống."
                });
            }

            if (request.SoDuBanDau < 0
                || request.SoDuBanDau > 9999999999999999.99m
                || decimal.Round(request.SoDuBanDau, 2)
                    != request.SoDuBanDau)
            {
                return BadRequest(new
                {
                    message = "Số dư ban đầu không hợp lệ."
                });
            }

            var account = new TaiKhoan
            {
                UserId = userId,
                TenTk = tenTk,
                LoaiTk = loaiTk,
                SoDuBanDau = request.SoDuBanDau,
                SoDuHienTai = request.SoDuBanDau,
                Version = 0,
                DonViTienTe = "VND",
                NgayTao = DateTime.UtcNow,
                TrangThai = true
            };

            _dbContext.TaiKhoans.Add(account);

            await _dbContext.SaveChangesAsync(cancellationToken);

            return StatusCode(201, new TaiKhoanResponse
            {
                TkId = account.TkId,
                TenTk = account.TenTk,
                LoaiTk = account.LoaiTk,
                SoDuHienTai = account.SoDuHienTai,
                DonViTienTe = account.DonViTienTe,
                NgayTao = account.NgayTao
            });
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
