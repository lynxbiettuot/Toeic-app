# Backend README

## Tổng quan
Đây là backend của ứng dụng TOEIC, được xây dựng với Node.js, Express và Prisma. Mã nguồn được tổ chức theo hướng tách riêng phần route, controller, cấu hình database và các phần dùng chung để dễ quản lý và mở rộng.

## Cấu trúc thư mục chính

### `src`
Đây là nơi chứa mã nguồn chính của backend.

#### `src/controllers`
Chứa logic xử lý nghiệp vụ cho từng nhóm chức năng. Controller nhận request từ route, xử lý dữ liệu, gọi database hoặc các phần hỗ trợ khác, rồi trả response về cho client.

- `controllers/auth`: chứa logic liên quan đến xác thực như đăng nhập, đăng ký, quên mật khẩu, refresh token, đăng xuất.
- `controllers/admin`: dành cho các nghiệp vụ phía admin.
- `controllers/customer`: dành cho các nghiệp vụ phía người dùng hoặc khách hàng.

#### `src/routes`
Chứa định nghĩa các endpoint của backend. Route có nhiệm vụ nhận request từ client và chuyển tiếp đến controller phù hợp.

- `routes/auth`: chứa các route nhỏ liên quan đến xác thực như login, signup, refresh token, logout, forgot password, reset password.
- `routes/admin`: chứa các route liên quan đến admin.
- `routes/customer`: chứa các route liên quan đến user hoặc customer.
- `auth.routes.ts`: file gom nhóm route auth để gắn vào app chính.

#### `src/lib`
Chứa các phần khởi tạo thư viện hoặc kết nối dùng chung cho toàn hệ thống.

- `lib/prisma.ts`: nơi tạo kết nối Prisma để backend làm việc với database.

#### `src/middleware`
Chứa các middleware dùng trong Express, ví dụ như kiểm tra token, phân quyền, xử lý lỗi, logging hoặc các bước chặn request trước khi vào controller.

#### `src/utils`
Chứa các hàm hỗ trợ dùng chung, ví dụ như helper xử lý chuỗi, thời gian, validate dữ liệu hoặc các tiện ích tái sử dụng.

#### `src/app.ts`
Là điểm khởi động chính của backend. File này thường dùng để cấu hình Express, gắn middleware, khai báo route và chạy server.

### `prisma`
Chứa cấu hình và tài nguyên liên quan đến Prisma.

- `schema.prisma`: mô tả cấu trúc database và các model.
- `migrations/`: chứa các migration để cập nhật schema database theo thời gian.

### `generated`
Chứa Prisma Client được sinh ra tự động từ schema. Phần này giúp backend gọi database thông qua Prisma.

### `node_modules`
Chứa các package được cài từ npm.

## Ý nghĩa tổ chức này
- Giúp backend rõ ràng giữa phần định nghĩa route và phần xử lý nghiệp vụ.
- Dễ tìm nơi cần sửa khi thêm hoặc thay đổi tính năng.
- Tách riêng phần database, logic và hạ tầng để code dễ bảo trì hơn.
- Thuận tiện mở rộng thêm nhiều module trong tương lai.

## Định hướng khi mở rộng
- Nếu thêm tính năng mới, nên tạo route và controller tương ứng theo từng nhóm nghiệp vụ.
- Nếu có logic dùng chung nhiều nơi, nên đưa vào `src/utils` hoặc `src/lib`.
- Nếu cần kiểm tra quyền, token hoặc xử lý request chung, nên đặt trong `src/middleware`.
- Nếu thay đổi cấu trúc dữ liệu, cập nhật trong `prisma/schema.prisma` và tạo migration mới.
