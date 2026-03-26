# Backend README

## Lưu ý khi clone code về

Khi vừa clone backend về máy mới, hãy làm theo thứ tự này để tránh lỗi môi trường:

1. Cài dependency:
```bash
npm install
```

2. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

3. Điền đủ các biến môi trường cần thiết, đặc biệt là:
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `GEMINI_API_KEY` nếu muốn dùng tính năng AI

4. Migrate database:
```bash
npx prisma migrate dev
```

5. Nếu cần đồng bộ schema nhanh trong môi trường local:
```bash
npx prisma db push
```

6. Chạy backend:
```bash
npm start
```

Lưu ý:
- Không chạy phần Gemini nếu chưa có `GEMINI_API_KEY`.
- Nếu vừa pull code mới về mà Prisma schema thay đổi, hãy migrate lại trước khi test API.
- Các file build `.js`, `.d.ts`, `.map` không phải source thật, không cần sửa tay.

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
Backend của TOEIC App được xây dựng bằng `Node.js`, `Express`, `TypeScript` và `Prisma`. Hệ thống hiện có các phần chính:

- authentication cho user và admin
- kết nối MySQL/MariaDB
- gửi OTP qua email
- quản lý refresh token
- API đề thi, câu hỏi, session làm bài
- tích hợp Gemini để sinh giải thích ngắn cho câu reading sau khi xem lại bài

## Công nghệ chính
- `Express 5`: dựng API server
- `Prisma + MariaDB adapter`: làm việc với database
- `JWT`: tạo access token và refresh token
- `bcrypt`: hash và so sánh mật khẩu
- `nodemailer`: gửi OTP quên mật khẩu qua email
- `cookie-parser` và `body-parser`: xử lý cookie và request body
- `@google/genai`: gọi Gemini API từ backend

## Cấu trúc thư mục chính

### `src/app.ts`
Điểm khởi động của backend:
- khởi tạo Express app
- đăng ký middleware parse body và cookie
- cấu hình CORS thủ công
- mount các route chính
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
- `user/exam.ts`: route dành cho user xem đề, làm bài, xem lại câu hỏi
- `admin/*`: route dành cho admin

### `src/controllers`
Chứa logic xử lý nghiệp vụ.

- `auth/auth.ts`: validate login/signup, tạo token, gửi OTP
- `user/exam.ts`: xử lý xem đề, làm bài, xem lại session, và sinh explanation bằng Gemini
- `admin/exam.ts`: import đề, quản lý câu hỏi, cập nhật exam

### `src/services/gemini.ts`
Chứa logic tích hợp Gemini:
- khởi tạo client Gemini
- nhận `image_url`
- `fetch` ảnh từ URL
- convert ảnh sang `base64`
- gửi ảnh + question + options + correct answer sang Gemini
- trả explanation ngắn gọn về cho controller

### `prisma/schema.prisma`
Mô tả schema database. Ngoài auth, schema đã có sẵn các bảng cho:

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
4. Controller validate dữ liệu đầu vào.
5. Controller thao tác với database thông qua Prisma.
6. Backend trả JSON response về client.

## Tích hợp AI-Gemini

Phần này dùng để sinh giải thích ngắn gọn cho câu hỏi reading sau khi người dùng đã nộp bài và mở lại chi tiết một câu.

### Mục tiêu
- Gemini không tự quyết định đáp án đúng.
- Backend lấy đáp án đúng đã có sẵn trong database.
- Gemini chỉ sinh phần giải thích ngắn dựa trên:
  - ảnh câu hỏi từ `image_url`
  - nội dung câu hỏi
  - 4 đáp án A/B/C/D
  - đáp án đúng trong DB
  - đáp án người dùng đã chọn, nếu có

### Luồng xử lý hiện tại
1. User nộp bài xong.
2. User bấm xem chi tiết một câu hỏi.
3. Backend vào route chi tiết câu hỏi trong `src/controllers/user/exam.ts`.
4. Nếu câu hỏi thuộc reading và `Questions.explanation` đang rỗng:
   - backend `fetch` ảnh từ `image_url`
   - convert ảnh sang `base64`
   - gửi ảnh + question + options + correct answer sang Gemini
   - nhận về explanation ngắn
   - lưu lại vào `Questions.explanation`
5. Những lần mở sau chỉ đọc lại từ DB nên nhanh hơn rất nhiều.

### File liên quan
- `src/services/gemini.ts`: khởi tạo Gemini client và hàm generate explanation.
- `src/controllers/user/exam.ts`: cắm logic generate vào API xem chi tiết câu hỏi.

### Biến môi trường cần có
Thêm vào `Backend/.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

Lưu ý:
- Tên biến phải đúng chính tả là `GEMINI_API_KEY`.
- Không nên commit file `.env` lên git.
- API key chỉ nên dùng ở backend, không đưa xuống frontend.

### Prompt/đầu ra nên giữ ngắn
Mục tiêu của explanation là:
- ngắn gọn
- dễ hiểu
- không cầu kỳ
- không bịa thêm dữ liệu ngoài đề bài

Backend hiện đang yêu cầu Gemini trả về một đoạn văn ngắn, khoảng 2-4 câu, nêu:
- vì sao đáp án đúng là đúng
- nếu người dùng chọn sai, thêm 1 câu rất ngắn nói vì sao đáp án đã chọn sai

### Cấu hình nên giữ để tránh file rác build ra root
Để TypeScript không sinh file `.js`, `.d.ts`, `.map` ngay cạnh source, backend đã cấu hình:

- `tsconfig.json` có `outDir: "./dist"`
- `include` chỉ lấy `src/**/*.ts` và `prisma.config.ts`
- `exclude` `test-db.ts`, `dist`, `node_modules`

Nhờ vậy:
- File build sẽ nằm trong `Backend/dist`
- Không còn sinh lẫn vào `Backend/src` hoặc `Backend/` root
- `test-db.ts` chỉ là script test, không bị compile ra file build đi kèm

### Cách chạy khi làm việc với Gemini
```bash
npm install
npm start
```

Nếu cần kiểm tra compile:
```bash
npm exec tsc --noEmit
```

Lưu ý:
- Trong project hiện tại vẫn có một số lỗi TypeScript cũ ở các module flashcard/dashboard, nên `tsc --noEmit` có thể báo lỗi không liên quan đến Gemini.
- Luồng Gemini mới không tạo bảng mới trong database, chỉ dùng `Questions.explanation` để cache kết quả.

## Một số endpoint tiêu biểu

### API đề thi cho user
- `GET /exams`
- `GET /exams/:id`
- `GET /exams/:id/questions`
- `POST /exams/:id/sessions`
- `POST /exams/:id/sessions/:sessionId/submit`
- `GET /exams/:id/sessions/:sessionId/summary`
- `GET /exams/:id/sessions/:sessionId/parts`
- `GET /exams/:id/sessions/:sessionId/parts/:partNumber/questions`
- `GET /exams/:id/sessions/:sessionId/questions/:questionId`

### Auth
- `POST /auth/signup`
- `POST /auth/login/user`
- `POST /auth/login/admin`
- `POST /auth/logout/user`
- `POST /auth/logout/admin`
- `POST /auth/refresh-token`
- `POST /auth/forgot-password/user`
- `POST /auth/forgot-password/admin`
- `POST /auth/reset-password/user`
- `POST /auth/reset-password/admin`

## Ghi chú thực hành
- Nếu muốn file build gọn hơn nữa, chỉ chạy `tsx` trong dev và dùng `tsc` khi thực sự cần build.
- Không nên đặt script test tạm ở root nếu không cần thiết. Nên đưa vào `src/scripts` hoặc `scripts/` để tránh lẫn với source chính.
- Khi thêm tính năng AI mới, nên giữ logic gọi AI trong `src/services/` thay vì viết trực tiếp trong controller để dễ bảo trì.
