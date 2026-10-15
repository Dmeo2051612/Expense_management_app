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
