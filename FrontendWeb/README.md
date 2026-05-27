# FrontendWeb TOEIC Admin

FrontendWeb là web admin của TOEIC App. Đây là giao diện dành cho quản trị viên để thao tác với dữ liệu hệ thống, không phải màn hình học viên.

## Chức năng

Web admin hiện hỗ trợ các nhóm chức năng chính sau:

- đăng nhập admin
- xem dashboard thống kê
- quản lý người dùng
- quản lý đề thi TOEIC
- import đề thi bằng Excel
- quản lý bộ từ vựng / flashcard của hệ thống
- chỉnh trạng thái public/private của dữ liệu

## Công nghệ

- `React`
- `Vite`
- `React Router DOM`
- `xlsx`

## Cấu trúc chính

- `src/main.jsx`: file mount ứng dụng React.
- `src/App.jsx`: định nghĩa routing toàn bộ khu vực admin.
- `src/components/layout/AdminLayout.jsx`: khung layout sau khi đăng nhập.
- `src/api/apiClient.js`: helper gọi API, gắn token và refresh token.
- `src/pages/*`: từng màn hình nghiệp vụ như login, dashboard, exam, vocab.
- `src/components/common/*`: component tái sử dụng.
- `src/styles/*`: CSS chia theo module.

## Các màn hình chính

- `LoginPage`: đăng nhập admin.
- `DashboardPage`: dashboard và quản lý người dùng.
- `ExamListPage`: danh sách đề thi.
- `ExamCreatePage`: tạo đề thi.
- `ImportExcelPage`: import đề thi từ file Excel.
- `ExamDetailPage`: xem và chỉnh sửa đề thi.
- `VocabManagementPage`: quản lý bộ từ vựng/flashcard.

## Phạm vi chức năng admin (chi tiết)

Để rõ ràng cho phần quản trị, web admin hiện bao gồm các nhóm chức năng chi tiết sau (liên quan trực tiếp đến phần bạn phụ trách):

- **Admin CRUD đề TOEIC:** tạo / sửa / xóa mềm / khôi phục đề, quản lý câu hỏi theo Part, thay đổi trạng thái (Draft / Published / Hidden), import đề từ Excel theo template và xem chi tiết câu hỏi để chỉnh sửa.
- **Admin quản lý Flashcard / Vocab:** tạo / sửa / xóa bộ từ vựng hệ thống, import bộ từ file, bật/tắt public (PUBLIC/PRIVATE), quản lý thẻ trong bộ, và chức năng moderating (cảnh báo/ẩn bộ của user khi cần).
- **Admin thống kê người dùng & kết quả:** dashboard tổng quan (số lượng user, phân phối điểm TOEIC), danh sách user, xem profile user kèm lịch sử session/kết quả, xem chi tiết kết quả một phiên, và xuất báo cáo (CSV) cho mục phân tích.

## API (ví dụ các route admin)

Trong FrontendWeb, các màn admin sẽ gọi các endpoint admin trên backend (ví dụ):

- `GET /admin/dashboard` — lấy dữ liệu overview cho dashboard.
- `GET /admin/users` — danh sách người dùng.
- `GET /admin/users/:userId` — hồ sơ chi tiết user và lịch sử session.
- `GET /admin/exams` — danh sách đề thi (admin view).
- `POST /admin/exams/import` — import đề thi từ Excel.
- `POST /admin/exams` / `PATCH /admin/exams/:id` / `DELETE /admin/exams/:id` — CRUD đề thi.
- `GET /admin/vocab-sets` / `POST /admin/vocab-sets/import` — quản lý bộ từ vựng hệ thống.

> Lưu ý: các route trên là mô tả tổng quát; frontend lấy base URL admin tại `src/api/apiClient.js` (mặc định `http://localhost:3000/admin`). Nếu backend đổi port hoặc deploy trên host khác, hãy cập nhật `src/api/apiClient.js` hoặc cấu hình môi trường.

## Cài đặt

### 1. Cài dependency

Chạy trong thư mục `FrontendWeb`:

```bash
npm install
```

### 2. Cấu hình backend

Hiện tại web admin đang gọi backend qua địa chỉ cứng:

- `http://localhost:3000/admin`

Nếu backend chạy ở máy khác hoặc khác port, cần chỉnh trong `src/api/apiClient.js`.

### 3. Chạy development server

```bash
npm run dev
```

### 4. Build production

```bash
npm run build
```

### 5. Preview bản build

```bash
npm run preview
```

## Lưu ý khi chạy

- Backend phải chạy trước thì web admin mới gọi được API.
- Token đăng nhập admin được lưu trong `localStorage`.
- Nếu API bị lỗi 401, helper `apiFetchJson` sẽ tự refresh token.
- Khi deploy thật, nên tách cấu hình backend ra biến môi trường thay vì để cứng trong code.

## Luồng sử dụng cơ bản

1. Mở web admin.
2. Đăng nhập tài khoản admin.
3. Vào dashboard, exam hoặc vocab theo nhu cầu.
4. Các màn hình sẽ gọi API backend để đọc/ghi dữ liệu.

## File nên đọc thêm

- `src/App.jsx`
- `src/api/apiClient.js`
- `src/components/layout/AdminLayout.jsx`
- `src/pages/vocab/VocabManagementPage.jsx`
- `src/pages/exam/*`

## Ghi chú triển khai

- Dự án web này phù hợp để chạy trên máy tính bằng trình duyệt.
- Nếu thay đổi API backend, cần kiểm tra lại các base URL ở `src/api/apiClient.js`.