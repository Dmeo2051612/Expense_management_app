using Expense_management_app.Data;
using Expense_management_app.Interceptors;
using Expense_management_app.Interfaces;
using Expense_management_app.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

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

app.MapControllers();

app.Run();