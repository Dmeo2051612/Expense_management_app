namespace Expense_management_app.Contracts
{
    public class AuthResponse
    {
        public string AccessToken { get; set; } = string.Empty;

        public string TokenType { get; set; } = "Bearer";

        public int ExpiresInSeconds { get; set; }

        public int UserId { get; set; }

        public string HoTen { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;
    }
}