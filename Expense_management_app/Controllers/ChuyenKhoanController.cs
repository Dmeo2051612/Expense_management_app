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

namespace Expense_management_app.Controllers
{

    [ApiController]
    [Route("api/chuyen-khoan")]
    public class ChuyenKhoanController : ControllerBase
    {
        private readonly IGiaoDichService _giaoDichService;

        public ChuyenKhoanController(
            IGiaoDichService giaoDichService)
        {
            _giaoDichService = giaoDichService;
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
