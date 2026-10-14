# Finora — giao diện mô phỏng quản lý chi tiêu

## Mở giao diện

1. Giải nén thư mục.
2. Để `index.html`, `style.css` và `app.js` cùng thư mục.
3. Mở `index.html` bằng trình duyệt, hoặc mở thư mục bằng VS Code và dùng Live Server.

## Tương tác đang có

- Mở form và thêm giao dịch thu/chi.
- Cập nhật các con số demo khi thêm giao dịch.
- Lọc giao dịch theo từ khóa và loại thu/chi.
- Tìm kiếm nhanh từ nút kính lúp.
- Chuyển phạm vi biểu đồ 3, 6 và 12 tháng.
- Dữ liệu prototype được lưu bằng `localStorage` trong trình duyệt.

## Giới hạn

Đây vẫn là prototype frontend, chưa gọi Flask Gateway, chưa xác thực JWT và chưa ghi dữ liệu vào MySQL. Dữ liệu demo có thể xóa bằng DevTools của trình duyệt (Application/Storage → Local Storage → xóa `finora-demo-state-v1`). Không nhập thông tin tài chính thật.
