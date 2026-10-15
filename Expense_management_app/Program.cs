using Expense_management_app.Data;
using Expense_management_app.Interceptors;
using Expense_management_app.Interfaces;
using Expense_management_app.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Expense_management_app.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var jwtKeyBase64 = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Chưa cấu hình Jwt:Key trong User Secrets.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "Chưa cấu hình Jwt:Issuer.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "Chưa cấu hình Jwt:Audience.");

byte[] jwtKeyBytes;

try
{
    jwtKeyBytes = Convert.FromBase64String(jwtKeyBase64);
}
catch (FormatException)
{
    throw new InvalidOperationException(
        "Jwt:Key phải là chuỗi Base64 hợp lệ.");
}

if (jwtKeyBytes.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key phải có ít nhất 32 byte.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey =
                    new SymmetricSecurityKey(jwtKeyBytes),

                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,

                ValidateAudience = true,
                ValidAudience = jwtAudience,

                ValidateLifetime = true,
                RequireExpirationTime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<
    IPasswordHasher<NguoiDung>,
    PasswordHasher<NguoiDung>>();

builder.Services.AddSingleton<TaiKhoanVersionInterceptor>();

builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
{
    var connectionString =
        builder.Configuration.GetConnectionString("MySql")
        ?? throw new InvalidOperationException(
            "Chưa cấu hình connection string MySql.");

    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString));

    options.AddInterceptors(
        serviceProvider.GetRequiredService<
            TaiKhoanVersionInterceptor>());
});

builder.Services.AddScoped<IGiaoDichService, GiaoDichService>();

builder.Services.AddProblemDetails();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();