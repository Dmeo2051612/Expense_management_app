# Finora Frontend Prototype

Frontend static prototype using HTML, CSS and JavaScript.

## Run locally

From this folder, run:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Open `http://localhost:8080`.

## Connect to local API

The frontend calls Flask Gateway at `http://127.0.0.1:8081`. In the account panel, enter a JWT created by the application's `/api/auth/login` endpoint and press **Tải từ API**. After a successful connection, the form **Tạo tài khoản** becomes available. Creating an account calls `POST /api/tai-khoan`, then refreshes the list using `GET /api/tai-khoan`.

The JWT is held only in JavaScript memory and is not written to localStorage/sessionStorage. Reloading the page clears it; paste a fresh token and reconnect.

The transaction table, budgets, chart and add-transaction modal remain demo-only and are not connected to backend APIs.


## Đăng nhập API

Giao diện gọi `POST /api/auth/login` qua Flask Gateway bằng email và mật khẩu, giữ access token chỉ trong bộ nhớ JavaScript của phiên trang, sau đó gọi `GET /api/tai-khoan`. Nút đăng xuất xóa token khỏi bộ nhớ. Không lưu JWT vào `localStorage` hoặc `sessionStorage`.

## Chuyển tiền qua API

Sau khi đăng nhập thành công và tải danh sách tài khoản, mục **Chuyển tiền** sẽ xuất hiện. Form gửi `POST /api/chuyen-khoan` qua Flask Gateway với JWT Bearer và `Idempotency-Key` dạng GUID. Sau khi API trả thành công, frontend tải lại số dư từ `GET /api/tai-khoan`.

Token chỉ được giữ trong bộ nhớ của trang. Với lỗi mạng/5xx không chắc chắn request đã được xử lý hay chưa, nếu người dùng gửi lại đúng nội dung trong cùng phiên trang, frontend sẽ dùng lại Idempotency-Key của lần thử đó để tránh chuyển trùng. Đừng dùng form prototype cho tiền thật; hãy tiếp tục chạy kiểm thử backend và rà soát bảo mật trước khi triển khai production.



## Lịch sử chuyển tiền qua API

Sau khi đăng nhập, frontend gọi `GET /api/chuyen-khoan` với JWT Bearer để tải tối đa 50 giao dịch chuyển tiền gần nhất của người dùng đang đăng nhập. Bảng lịch sử hiển thị mã giao dịch, thời gian, tài khoản nguồn/đích, số tiền và mô tả. Nút Tải lại lịch sử gửi request mới; khi logout, bảng lịch sử được ẩn và nội dung giao dịch được xóa khỏi giao diện. Phân quyền theo `userId` được thực hiện ở backend, không dựa vào bộ lọc từ frontend.


## Thu nhập, chi tiêu và danh mục API

Sau khi đăng nhập, giao diện dùng các endpoint C# qua Flask Gateway:

- `GET /api/danh-muc`: tải danh mục của người dùng.
- `POST /api/danh-muc`: tạo danh mục thu (`thu`) hoặc chi (`chi`).
- `GET /api/giao-dich`: tải tối đa 50 giao dịch thu/chi gần nhất của người dùng.
- `POST /api/giao-dich`: ghi nhận thu nhập hoặc chi tiêu; backend kiểm tra tài khoản/danh mục, cập nhật số dư và lưu giao dịch trong transaction.

Nút “Thêm giao dịch” cần phiên đăng nhập. Danh mục và tài khoản được tải từ API, không dùng danh mục/tài khoản mẫu để gửi giao dịch thật. Lịch sử thu/chi được hiển thị trong bảng “Giao dịch gần đây”.

Lưu ý: API thu/chi hiện chưa có idempotency key ở phía backend. Nếu trình duyệt mất kết nối sau khi gửi POST, hãy tải lại lịch sử để xác nhận giao dịch đã được lưu trước khi gửi lại. Số liệu ngân sách và biểu đồ hiện vẫn là minh họa; thẻ tổng số dư lấy từ tài khoản API, còn tổng thu/chi tháng lấy từ các giao dịch được API trả về (tối đa 50).


## Ngân sách qua API

Sau khi đăng nhập, Finora tải ngân sách bằng `GET /api/ngan-sach` và tạo ngân sách bằng `POST /api/ngan-sach`. Form chỉ cho chọn danh mục chi tiêu của người dùng hiện tại, kèm giới hạn và khoảng ngày. Danh sách hiển thị số tiền đã chi, số tiền còn lại và trạng thái vượt giới hạn do backend tính toán. Sau khi ghi nhận giao dịch thu/chi hoặc tạo ngân sách, frontend tải lại dữ liệu tương ứng từ API.
