using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Expense_management_app.Contracts;
using Expense_management_app.Data;
using Expense_management_app.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Expense_management_app.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly IPasswordHasher<NguoiDung> _passwordHasher;
        private readonly IConfiguration _configuration;

        public AuthController(
            AppDbContext dbContext,
            IPasswordHasher<NguoiDung> passwordHasher,
            IConfiguration configuration)
        {
            _dbContext = dbContext;
            _passwordHasher = passwordHasher;
            _configuration = configuration;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] DangKyRequest request,
            CancellationToken cancellationToken)
        {
            string email = request.Email.Trim().ToLowerInvariant();

            bool emailExists = await _dbContext.NguoiDungs
                .AnyAsync(
                    x => x.Email == email && x.TrangThai,
                    cancellationToken);

            if (emailExists)
            {
                return Conflict(new
                {
                    message = "Email đã được đăng ký."
                });
            }

            var user = new NguoiDung
            {
                HoTen = request.HoTen.Trim(),
                Email = email,
                SoDienThoai = request.SoDienThoai.Trim(),
                NgayTao = DateTime.UtcNow,
                TrangThai = true
            };

            user.PasswordHash = _passwordHasher.HashPassword(
                user,
                request.MatKhau);

            _dbContext.NguoiDungs.Add(user);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                return Conflict(new
                {
                    message = "Không thể đăng ký. Email có thể đã được sử dụng."
                });
            }

            return StatusCode(201, new
            {
                userId = user.UserId,
                hoTen = user.HoTen,
                email = user.Email
            });
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(
            [FromBody] DangNhapRequest request,
            CancellationToken cancellationToken)
        {
            string email = request.Email.Trim().ToLowerInvariant();

            var user = await _dbContext.NguoiDungs
                .SingleOrDefaultAsync(
                    x => x.Email == email && x.TrangThai,
                    cancellationToken);

            if (user == null)
            {
                return Unauthorized(new
                {
                    message = "Email hoặc mật khẩu không đúng."
                });
            }

            var verification = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.MatKhau);

            if (verification == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new
                {
                    message = "Email hoặc mật khẩu không đúng."
                });
            }

            if (verification ==
                PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.PasswordHash = _passwordHasher.HashPassword(
                    user,
                    request.MatKhau);

                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            DateTime now = DateTime.UtcNow;
            DateTime expires = now.AddMinutes(60);

            var claims = new List<Claim>
            {
                new Claim(
                    JwtRegisteredClaimNames.Sub,
                    user.UserId.ToString()),

                new Claim(
                    JwtRegisteredClaimNames.Email,
                    user.Email),

                new Claim(
                    JwtRegisteredClaimNames.Name,
                    user.HoTen),

                new Claim(
                    JwtRegisteredClaimNames.Jti,
                    Guid.NewGuid().ToString())
            };

            string keyBase64 =
                _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException(
                    "Thiếu cấu hình Jwt:Key.");

            string issuer =
                _configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException(
                    "Thiếu cấu hình Jwt:Issuer.");

            string audience =
                _configuration["Jwt:Audience"]
                ?? throw new InvalidOperationException(
                    "Thiếu cấu hình Jwt:Audience.");

            var signingKey = new SymmetricSecurityKey(
                Convert.FromBase64String(keyBase64));

            var credentials = new SigningCredentials(
                signingKey,
                SecurityAlgorithms.HmacSha256);

            var jwt = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: now,
                expires: expires,
                signingCredentials: credentials);

            string accessToken =
                new JwtSecurityTokenHandler().WriteToken(jwt);

            return Ok(new AuthResponse
            {
                AccessToken = accessToken,
                TokenType = "Bearer",
                ExpiresInSeconds = 3600,
                UserId = user.UserId,
                HoTen = user.HoTen,
                Email = user.Email
            });
        }
    }
}