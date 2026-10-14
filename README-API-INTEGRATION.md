# Finora: tích hợp danh sách tài khoản qua Flask Gateway

Bản này giữ nguyên dashboard demo nhưng bổ sung một khung để nhập JWT tạm thời và tải tài khoản thật từ endpoint `GET /api/tai-khoan`. JWT chỉ nằm trong trường nhập trên trang; không ghi vào localStorage hoặc sessionStorage. Các chỉ số và giao dịch khác trên dashboard vẫn là dữ liệu demo.

## 1. Thêm endpoint C#

Sao chép `TaiKhoanController.cs` vào thư mục `Controllers` trong project C# `Expense_management_app`. File giả định:

- namespace `Expense_management_app.Data` có `AppDbContext`.
- `AppDbContext` có `DbSet<TaiKhoan> TaiKhoans`.
- entity `TaiKhoan` có các thuộc tính `TkId`, `UserId`, `TenTk`, `LoaiTk`, `SoDuHienTai`, `DonViTienTe`, `NgayTao`, `TrangThai`.
- `Program.cs` đã cấu hình JWT Bearer và gọi `app.UseAuthentication()` trước `app.UseAuthorization()`.

Endpoint chỉ trả các tài khoản đang hoạt động có `user_id` bằng user id lấy từ JWT đã xác thực. Nếu tên namespace/property trong project thực tế khác, chỉnh lại trước khi build.

## 2. Chạy local dev

Giữ Redis, Flask Gateway và C# API đang chạy. Nếu C# chạy bằng Visual Studio, xem URL `http://localhost:<port>` trong cửa sổ Output/Terminal. Trong PowerShell dùng để chạy Flask, đặt `BACKEND_URL` đúng địa chỉ này rồi khởi động lại Flask, ví dụ:

```powershell
$env:BACKEND_URL = "http://localhost:58098"
$env:PORT = "8081"
$env:ALLOWED_ORIGINS = "http://localhost:8080"
python server.py
```

Port `58098` chỉ là ví dụ; thay bằng HTTP port thực tế. Gateway phải có CORS `allow_headers` bao gồm `Authorization` và route `/api/...` chuyển tiếp sang backend.

Chạy một terminal khác trong thư mục `frontend-prototype`:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Mở đúng URL `http://localhost:8080` trong trình duyệt. Không mở `index.html` bằng `file://`, vì origin đó không khớp cấu hình CORS.

## 3. Tải tài khoản

1. Tạo token phát triển còn hạn trong project C# (ví dụ công cụ `dotnet user-jwts` nếu backend đang dùng cấu hình của công cụ đó).
2. Mở khu vực **Tài khoản của tôi** trên dashboard.
3. Dán token vào trường JWT access token và chọn **Tải từ API**.
4. Khi thành công, các thẻ tài khoản demo được thay bằng danh sách API.

Không commit hoặc chia sẻ JWT. Nếu backend đang chạy bên trong Docker Compose với `Jwt:Key` riêng từ `.env`, token do `dotnet user-jwts` phát hành ở môi trường local có thể không hợp lệ với container đó; issuer, audience và signing key phải khớp.

## 4. Cách đọc lỗi

- `401`: token không hợp lệ/hết hạn hoặc cấu hình issuer/audience/signing key không khớp.
- `403`: tài khoản không có quyền truy cập.
- `502`: Flask không kết nối được backend C#; kiểm tra `BACKEND_URL`.
- `503`: Gateway không truy cập được Redis.
- Lỗi CORS trong trình duyệt: mở frontend qua `http://localhost:8080` và cấu hình `ALLOWED_ORIGINS=http://localhost:8080`; đảm bảo Flask cho phép header `Authorization`.

Không nhập dữ liệu tài chính thật vào dashboard demo. Chỉ phần danh sách tài khoản được kết nối API; tổng quan, biểu đồ, ngân sách và danh sách giao dịch còn là dữ liệu mẫu.
