using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Expense_management_app.Contracts;
using Expense_management_app.Interfaces;
using Expense_management_app.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Expense_management_app.Data;

namespace Expense_management_app.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/chuyen-khoan")]
    public class ChuyenKhoanController : ControllerBase
    {
        private readonly IGiaoDichService _giaoDichService;
        private readonly AppDbContext _dbContext;

        public ChuyenKhoanController(
            IGiaoDichService giaoDichService,
            AppDbContext dbContext)
        {
            _giaoDichService = giaoDichService;
            _dbContext = dbContext;
        }


        [HttpGet]
        public async Task<IActionResult> GetHistory(
    CancellationToken cancellationToken)
        {
            string? claim = User.FindFirst(
                ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            var history = await (
                from transfer in _dbContext.ChuyenKhoans.AsNoTracking()

                join source in _dbContext.TaiKhoans.AsNoTracking()
                    on new
                    {
                        TkId = transfer.TkNguonId,
                        transfer.UserId
                    }
                    equals new
                    {
                        TkId = source.TkId,
                        source.UserId
                    }

                join destination in _dbContext.TaiKhoans.AsNoTracking()
                    on new
                    {
                        TkId = transfer.TkDichId,
                        transfer.UserId
                    }
                    equals new
                    {
                        TkId = destination.TkId,
                        destination.UserId
                    }

                where transfer.UserId == userId

                orderby transfer.NgayTao descending,
                        transfer.ChuyenKhoanId descending

                select new ChuyenKhoanHistoryResponse
                {
                    ChuyenKhoanId = transfer.ChuyenKhoanId,

                    TkNguonId = transfer.TkNguonId,
                    TenTkNguon = source.TenTk,

                    TkDichId = transfer.TkDichId,
                    TenTkDich = destination.TenTk,

                    SoTien = transfer.SoTien,
                    NgayTao = transfer.NgayTao,
                    MoTa = transfer.MoTa
                })
                .Take(50)
                .ToListAsync(cancellationToken);

            return Ok(history);
        }

        [HttpPost]
        public async Task<IActionResult> ChuyenTien(
            [FromHeader(Name = "Idempotency-Key")]
            string? idempotencyKey,
            [FromBody] ChuyenTienRequest request,
            CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(idempotencyKey, out Guid key)
                || key == Guid.Empty)
            {
                ModelState.AddModelError(
                    "Idempotency-Key",
                    "Header Idempotency-Key phải là GUID hợp lệ.");

                return ValidationProblem(ModelState);
            }

            string? claim = User.FindFirst(
                ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            try
            {
                int id = await _giaoDichService.ChuyenTienAsync(
                    userId,
                    request.TkNguonId,
                    request.TkDichId,
                    request.SoTien,
                    request.MoTa,
                    key,
                    cancellationToken);

                return Ok(new
                {
                    chuyenKhoanId = id
                });
            }
            catch (IdempotencyConflictException ex)
            {
                return Problem(
                    title: "Idempotency key conflict",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status409Conflict);
            }
            catch (ArgumentException ex)
            {
                return Problem(
                    title: "Invalid request",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status400BadRequest);
            }
            catch (InvalidOperationException ex)
            {
                return Problem(
                    title: "Transfer rejected",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status409Conflict);
            }
            catch (DbUpdateException)
            {
                return Problem(
                    title: "Database error",
                    detail: "Không thể hoàn tất giao dịch. Vui lòng thử lại sau.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        }
    }
}
