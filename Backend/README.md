# Backend TOEIC App

Backend là API server của TOEIC App, chịu trách nhiệm cho các chức năng:

- xác thực người dùng và admin
- quản lý đề thi TOEIC, gồm CRUD đề và câu hỏi cho admin
- quản lý flashcard và spaced repetition, gồm cả thư viện công khai và thư viện cá nhân
- lưu kết quả làm bài, lịch sử và thống kê cho user và admin
- tích hợp Gemini để sinh giải thích cho câu hỏi reading

## Công nghệ

- `Node.js`
- `Express 5`
- `TypeScript`
- `Prisma`
- `MySQL/MariaDB`
- `JWT`
- `bcrypt`
- `nodemailer`
- `multer`
- `@google/genai`

## Cấu trúc chính

- `src/app.ts`: điểm khởi động của server, gắn middleware và mount route.
- `src/lib/prisma.ts`: khởi tạo Prisma Client.
- `src/routes`: định nghĩa endpoint.
- `src/controllers`: nhận request, validate dữ liệu, trả response.
- `src/services`: xử lý nghiệp vụ chính.
- `src/utils`: hàm dùng chung như validate, normalize, tính điểm, xử lý flashcard.
- `prisma/schema.prisma`: schema CSDL.

## Các module chính

### 1. Authentication

Hệ thống có 2 nhóm đăng nhập:

- user
- admin

Ngoài ra còn có:

- refresh token
- quên mật khẩu bằng OTP
- đổi mật khẩu

### 2. Exam

Backend quản lý:

- danh sách đề thi
- chi tiết đề thi
- câu hỏi theo part
- session làm bài
- submit bài
- xem lại đáp án và giải thích
- CRUD đề thi cho admin
- import đề thi bằng Excel
- thêm, sửa, xóa và khôi phục câu hỏi trong đề
- đổi trạng thái đề thi để public hoặc ẩn

### 3. Flashcard và Spaced Repetition

Backend hỗ trợ:

- tạo và quản lý bộ flashcard
- tạo/sửa/xóa flashcard trong bộ
- xem bộ công khai
- import bộ công khai vào thư viện cá nhân
- quản lý bộ flashcard hệ thống bằng admin
- đổi trạng thái public/private, ẩn hoặc khôi phục bộ flashcard
- lấy thẻ đến hạn ôn
- chấm mức độ nhớ
- tính lịch ôn theo SM-2
- ghi review log và thống kê số lần ôn

### 4. Dashboard và thống kê

Backend cung cấp dữ liệu cho màn quản trị thống kê:

- tổng quan số lượng user, đề thi và bộ flashcard
- danh sách user và thông tin chi tiết từng user
- lịch sử làm bài và kết quả theo từng đề
- thống kê điểm số và phân phối kết quả
- xuất dữ liệu báo cáo cho admin nếu cần

### 5. Gemini

Gemini chỉ dùng để sinh phần giải thích ngắn cho câu reading. Backend lấy đáp án đúng từ CSDL trước, rồi mới gửi dữ liệu phù hợp sang Gemini để sinh explanation.

## Cài đặt

### 1. Cài dependency

Chạy trong thư mục `Backend`:

```bash
npm install
```

### 2. Tạo file môi trường

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Sau đó cấu hình các biến cần thiết.

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối MySQL/MariaDB dùng cho Prisma |
| `SHADOW_DATABASE_URL` | Chuỗi kết nối database shadow cho migration |
| `JWT_ACCESS_SECRET` | Secret cho access token |
| `JWT_REFRESH_SECRET` | Secret cho refresh token |
| `EMAIL_USER` | Email gửi OTP |
| `EMAIL_PASS` | App password của email |
| `GEMINI_API_KEY` | API key của Gemini |

### 3. Khởi tạo database

Chạy migration và generate Prisma Client:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Tạo tài khoản admin mặc định

Nếu cần tài khoản admin để đăng nhập web quản trị, có thể dùng script seed trong `src/scripts/upsertAdminAccounts.ts` hoặc tạo account trực tiếp trong database tùy workflow của bạn.

### 5. Chạy backend

```bash
npm start
```

## Lưu ý khi chạy

- Backend phải kết nối được database trước khi chạy frontend.
- Một số API yêu cầu token hợp lệ.
- Nếu đổi schema Prisma thì cần chạy lại migrate và generate.
- `GEMINI_API_KEY` chỉ dùng ở backend, không đưa xuống frontend.

## File nên đọc khi cần hiểu code

- `src/routes/flashcard.routes.ts`
- `src/controllers/flashcard/*`
- `src/services/flashcard/*`
- `src/utils/flashcard/*`
- `prisma/schema.prisma`

## API tiêu biểu

### Flashcard

- `GET /flashcards/public`
- `GET /flashcards/public/:setId`
- `POST /flashcards/public/:setId/import`
- `GET /flashcards/sets`
- `POST /flashcards/sets`
- `PUT /flashcards/sets/:setId`
- `DELETE /flashcards/sets/:setId`
- `GET /flashcards/sets/:setId/cards`
- `POST /flashcards/sets/:setId/cards`
- `PUT /flashcards/cards/:cardId`
- `DELETE /flashcards/cards/:cardId`

### Spaced Repetition

- `GET /flashcards/review/due`
- `POST /flashcards/review/:cardId/rate`
- `GET /flashcards/review/stats/today`
- `GET /flashcards/practice`

### Exam và auth

- `GET /exams`
- `POST /exams/:id/sessions`
- `GET /admin/dashboard/overview`
- `GET /admin/dashboard/users`
- `GET /admin/exams`
- `POST /admin/exams`
- `POST /admin/exams/import-excel`
- `GET /admin/vocab-sets`
- `POST /admin/vocab-sets/import`
- `POST /auth/login/user`
- `POST /auth/login/admin`
- `POST /auth/refresh-token`

## Tóm tắt luồng xử lý

1. Frontend gọi API.
2. Route nhận request.
3. Controller validate dữ liệu.
4. Service xử lý nghiệp vụ.
5. Prisma đọc/ghi CSDL.
6. Backend trả JSON response.
