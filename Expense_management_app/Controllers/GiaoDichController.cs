using System.Security.Claims;
using Expense_management_app.Contracts;
using Expense_management_app.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Expense_management_app.Data;


namespace Expense_management_app.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/giao-dich")]
    public class GiaoDichController : ControllerBase
    {
        private readonly IThuChiService _thuChiService;
        private readonly AppDbContext _dbContext;

        public GiaoDichController(
            IThuChiService thuChiService,
            AppDbContext dbContext)
        {
            _thuChiService = thuChiService;
            _dbContext = dbContext;
        }


        [HttpGet]
        public async Task<IActionResult> GetMyTransactions(
    CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            var history = await (
                from transaction in _dbContext.GiaoDichs.AsNoTracking()

                join account in _dbContext.TaiKhoans.AsNoTracking()
                    on new
                    {
                        transaction.TkId,
                        transaction.UserId
                    }
                    equals new
                    {
                        account.TkId,
                        account.UserId
                    }

                join category in _dbContext.DanhMucs.AsNoTracking()
                    on new
                    {
                        transaction.DanhMucId,
                        transaction.UserId,
                        transaction.LoaiGd
                    }
                    equals new
                    {
                        category.DanhMucId,
                        category.UserId,
                        category.LoaiGd
                    }

                where transaction.UserId == userId

                orderby transaction.NgayGd descending,
                        transaction.GiaoDichId descending

                select new
                {
                    giaoDichId = transaction.GiaoDichId,
                    tkId = transaction.TkId,
                    tenTk = account.TenTk,
                    danhMucId = transaction.DanhMucId,
                    tenDanhMuc = category.TenDanhMuc,
                    loaiGd = transaction.LoaiGd,
                    soTien = transaction.SoTien,
                    ngayGd = transaction.NgayGd,
                    moTa = transaction.MoTa
                })
                .Take(50)
                .ToListAsync(cancellationToken);

            return Ok(history);
        }


        [HttpPost]
        public async Task<IActionResult> CreateTransaction(
            [FromBody] TaoGiaoDichRequest request,
            CancellationToken cancellationToken)
        {
            string? claim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out int userId) || userId <= 0)
                return Unauthorized();

            try
            {
                int id = await _thuChiService.TaoGiaoDichAsync(
                    userId,
                    request.TkId,
                    request.DanhMucId,
                    request.LoaiGd,
                    request.SoTien,
                    request.NgayGd,
                    request.MoTa,
                    cancellationToken);

                return StatusCode(StatusCodes.Status201Created, new
                {
                    giaoDichId = id
                });
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
                    title: "Transaction rejected",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status409Conflict);
            }
            catch (DbUpdateException)
            {
                return Problem(
                    title: "Database error",
                    detail: "Không thể lưu giao dịch. Vui lòng thử lại sau.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        }
    }
}