using System.Reflection;
using Expense_management_app.Data;
using Expense_management_app.Interceptors;
using Expense_management_app.Interfaces;
using Expense_management_app.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

Console.WriteLine("===== EF ENTITY DIAGNOSTIC =====");

var dbSetProperties = typeof(AppDbContext)
    .GetProperties(BindingFlags.Public | BindingFlags.Instance)
    .Where(p =>
        p.PropertyType.IsGenericType &&
        p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>));

foreach (var dbSetProperty in dbSetProperties)
{
    var entityType = dbSetProperty.PropertyType.GetGenericArguments()[0];

    Console.WriteLine($"DbSet: {dbSetProperty.Name}");
    Console.WriteLine($"Entity: {entityType.FullName}");

    foreach (var property in entityType.GetProperties(
                 BindingFlags.Public |
                 BindingFlags.Instance |
                 BindingFlags.DeclaredOnly))
    {
        Console.WriteLine(
            $"  {property.Name} : {property.PropertyType.FullName}");
    }
}

Console.WriteLine("===== END DIAGNOSTIC =====");

builder.Services.AddControllers();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddAuthorization();

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