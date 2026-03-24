# Backend README

## Cách chạy nhanh

### 1. Cài dependency
```bash
npm install
```

### 2. Tạo file môi trường
```bash
cp .env.example .env
```

Sau đó cập nhật lại các biến trong `.env` cho đúng với máy local của bạn.

### 3. Migrate database
```bash
npx prisma migrate dev
```

Nếu chỉ cần đồng bộ schema và generate Prisma Client nhanh từ database hiện có, có thể dùng:

```bash
npx prisma db push
```

### 4. Chạy server
```bash
npm start
```

## Tổng quan
Backend của TOEIC App được xây dựng bằng `Node.js`, `Express`, `TypeScript` và `Prisma`. Hiện tại phần đã triển khai rõ nhất là luồng `authentication` cho `user` và `admin`, kèm kết nối `MySQL/MariaDB`, gửi OTP qua email, quản lý `refresh token` và API gốc để lấy danh sách đề thi public.

## Công nghệ chính
- `Express 5`: dựng API server.
- `Prisma + MariaDB adapter`: làm việc với database.
- `JWT`: tạo access token và refresh token.
- `bcrypt`: hash và so sánh mật khẩu.
- `nodemailer`: gửi OTP quên mật khẩu qua email.
- `cookie-parser` và `body-parser`: xử lý cookie và request body.

## Cấu trúc thư mục chính

### `src/app.ts`
Điểm khởi động của backend:
- khởi tạo Express app
- đăng ký middleware parse body và cookie
- cấu hình CORS thủ công
- mount route `/auth`
- kết nối Prisma trước khi mở server

### `src/lib/prisma.ts`
Khởi tạo `PrismaClient` thông qua `@prisma/adapter-mariadb`, đọc cấu hình kết nối từ biến môi trường:
- `DATABASE_HOST`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

### `src/routes`
Khai báo endpoint và nối endpoint vào controller.

- `auth.routes.ts`: gom toàn bộ route auth dưới prefix `/auth`
- `auth/login.ts`: đăng nhập user/admin
- `auth/signup.ts`: đăng ký user
- `auth/logout.ts`: đăng xuất user/admin
- `auth/refresh-token.ts`: cấp lại access token từ cookie refresh token
- `auth/forgot-password.ts`: gửi OTP đặt lại mật khẩu
- `auth/reset-password.ts`: xác thực OTP và đổi mật khẩu

### `src/controllers/auth/auth.ts`
Chứa toàn bộ xử lý nghiệp vụ auth:
- validate email, password
- tạo hash password
- tạo JWT
- lưu refresh token vào database
- gửi OTP qua email
- reset password bằng OTP

### `prisma/schema.prisma`
Mô tả schema database. Ngoài auth, schema đã chuẩn bị sẵn các bảng cho:
- `Users`, `Admins`
- `Refresh_tokens`, `Admin_refresh_tokens`
- `Exam_sets`, `Questions`, `Question_groups`, `Answer_options`
- `Test_sessions`, `User_answers`, `Session_part_scores`
- `Flashcard_sets`, `Flashcards`, `Spaced_repetition_cards`, `Flashcard_review_logs`, `User_saved_sets`

## Luồng backend hiện tại

### 1. Khởi động server
1. Chạy lệnh `npm start`.
2. `src/app.ts` tạo Express app.
3. App nạp middleware parse JSON, form data và cookie.
4. App cấu hình CORS.
5. App kết nối database qua `prisma.$connect()`.
6. Nếu kết nối thành công, server lắng nghe tại `PORT` hoặc mặc định `3000`.

### 2. Luồng request tổng quát
1. Client gửi request đến backend.
2. Express nhận request và đi qua middleware chung.
3. Route tương ứng được match trong `src/routes`.
4. Controller xử lý validate dữ liệu đầu vào.
5. Controller thao tác với database thông qua Prisma.
6. Backend trả JSON response về client.

### 3. Luồng API gốc `/`
1. Client gọi `GET /`.
2. Backend truy vấn bảng `Exam_sets`.
3. Chỉ lấy các bộ đề có `status = "PUBLIC"`.
4. Trả về message chào mừng và danh sách đề public cơ bản.

### 4. Luồng đăng ký user
Endpoint: `POST /auth/signup`

1. Nhận `email`, `password`, `confirmPassword`, `name`.
2. Kiểm tra dữ liệu bắt buộc, định dạng email, độ dài mật khẩu.
3. Kiểm tra email đã tồn tại trong bảng `Users` chưa.
4. So sánh `password` và `confirmPassword`.
5. Hash mật khẩu bằng `bcrypt`.
6. Tạo bản ghi user mới trong database.
7. Trả về thông tin user đã loại bỏ các trường nhạy cảm.

### 5. Luồng đăng nhập
Endpoints:
- `POST /auth/login/user`
- `POST /auth/login/admin`

1. Nhận `email`, `password`.
2. Validate format.
3. Tìm tài khoản trong bảng `Users` hoặc `Admins`.
4. Kiểm tra tài khoản có đang active không.
5. So sánh mật khẩu bằng `bcrypt.compare`.
6. Tạo:
- `accessToken` hết hạn sau `1h`
- `refreshToken` hết hạn sau `7d`
7. Lưu refresh token vào bảng:
- `Refresh_tokens` với user
- `Admin_refresh_tokens` với admin
8. Gắn refresh token vào cookie `jwt` dạng `httpOnly`.
9. Trả access token, refresh token và thông tin tài khoản cho client.

### 6. Luồng cấp lại access token
Endpoint: `POST /auth/refresh-token`

1. Backend đọc cookie `jwt`.
2. Nếu không có cookie, trả `401`.
3. Xác thực refresh token bằng `JWT_REFRESH_SECRET`.
4. Dựa trên payload để phân biệt token của `user` hay `admin`.
5. Kiểm tra token đó còn tồn tại trong database không.
6. Nếu hợp lệ, tạo access token mới hết hạn `1h`.
7. Trả access token mới cho client.

### 7. Luồng đăng xuất
Endpoints:
- `POST /auth/logout/user`
- `POST /auth/logout/admin`

1. Backend đọc cookie `jwt`.
2. Nếu có token, xóa token đó khỏi bảng refresh token tương ứng.
3. Xóa cookie `jwt`.
4. Trả response logout thành công.

### 8. Luồng quên mật khẩu
Endpoints:
- `POST /auth/forgot-password/user`
- `POST /auth/forgot-password/admin`

1. Nhận email từ client.
2. Kiểm tra email hợp lệ và tài khoản có tồn tại.
3. Sinh OTP 4 chữ số.
4. Đặt thời gian hết hạn OTP là `5 phút`.
5. Lưu `reset_otp` và `otp_expiry` vào database.
6. Gửi OTP qua Gmail SMTP bằng `nodemailer`.
7. Trả response thông báo đã gửi OTP.

### 9. Luồng reset mật khẩu bằng OTP
Endpoints:
- `POST /auth/reset-password/user`
- `POST /auth/reset-password/admin`

1. Nhận `email`, `otpVerify`, `newPassword`, `confirmNewPassword`.
2. Kiểm tra đủ trường dữ liệu.
3. Kiểm tra mật khẩu mới và xác nhận mật khẩu.
4. Lấy tài khoản từ database.
5. Kiểm tra OTP còn hạn hay không.
6. So sánh OTP người dùng nhập với `reset_otp`.
7. Hash mật khẩu mới.
8. Cập nhật mật khẩu mới, đồng thời xóa `reset_otp` và `otp_expiry`.
9. Trả response đổi mật khẩu thành công.

## Danh sách endpoint hiện có

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Lấy danh sách exam set public |
| `POST` | `/auth/signup` | Đăng ký user |
| `POST` | `/auth/login/user` | Đăng nhập user |
| `POST` | `/auth/login/admin` | Đăng nhập admin |
| `POST` | `/auth/logout/user` | Đăng xuất user |
| `POST` | `/auth/logout/admin` | Đăng xuất admin |
| `POST` | `/auth/refresh-token` | Lấy access token mới từ refresh token |
| `POST` | `/auth/forgot-password/user` | Gửi OTP quên mật khẩu cho user |
| `POST` | `/auth/forgot-password/admin` | Gửi OTP quên mật khẩu cho admin |
| `POST` | `/auth/reset-password/user` | Xác thực OTP và đổi mật khẩu user |
| `POST` | `/auth/reset-password/admin` | Xác thực OTP và đổi mật khẩu admin |

## Biến môi trường cần có
Tạo file `Backend/.env` từ `Backend/.env.example` và cấu hình:

- `PORT`: cổng chạy backend
- `NODE_ENV`: môi trường chạy app
- `DATABASE_URL`: chuỗi kết nối tổng quát để tham khảo hoặc dùng cho tooling khác
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `EMAIL_USER`
- `EMAIL_PASS`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Lưu ý:
- Code hiện tại kết nối Prisma bằng `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`; không đọc trực tiếp `DATABASE_URL`.
- `EMAIL_PASS` nên là `App Password` của Gmail, không nên dùng mật khẩu tài khoản thật.
- Secret JWT trong môi trường production cần đủ dài và khó đoán.

## Cách chạy local

### 1. Cài dependency
```bash
npm install
```

### 2. Tạo file môi trường
```bash
cp .env.example .env
```

Sau đó chỉnh lại thông tin database, email và JWT secret.

### 3. Chạy server
```bash
npm start
```

Mặc định backend chạy tại `http://localhost:3000`.

## Định hướng mở rộng
- Tách controller auth thành nhiều file nhỏ hơn khi số lượng nghiệp vụ tăng.
- Thêm middleware xác thực access token cho các route private.
- Thêm middleware phân quyền rõ hơn giữa `USER` và `ADMIN`.
- Bổ sung validation layer riêng để tránh lặp logic trong controller.
- Viết tài liệu request/response mẫu cho từng endpoint.
