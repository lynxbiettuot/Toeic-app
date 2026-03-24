# Frontend README

## Tổng quan
Đây là frontend mobile được xây dựng bằng Expo + React Native. Các file trong `src` được tổ chức theo từng nhóm chức năng để dễ quản lý, dễ mở rộng và tách riêng giao diện, logic và cấu hình.

## Cấu trúc thư mục trong `src`

### `src/api`
Chứa các phần liên quan đến việc làm việc với API hoặc các module giao tiếp với backend. Thư mục này phù hợp để đặt các client API dùng chung cho nhiều feature.

### `src/bootstrap`
Chứa phần khởi tạo app và điều phối luồng hiển thị chính của ứng dụng. Nơi này thường được dùng để quyết định màn hình đầu tiên, điều hướng ban đầu hoặc các bước setup cấp app.

### `src/config`
Chứa các cấu hình dùng chung cho frontend, ví dụ như địa chỉ API, biến môi trường hoặc các giá trị cấu hình cần dùng lại ở nhiều nơi.

### `src/features`
Đây là thư mục chính của project, chứa các nghiệp vụ lớn được tách theo từng tính năng. Mỗi feature thường tự quản lý màn hình, service, type, component và constant riêng của nó.

#### `src/features/auth`
Chứa toàn bộ những gì liên quan đến xác thực người dùng, ví dụ như đăng nhập, đăng ký, quên mật khẩu, OTP, giao diện auth, type auth và logic gọi API auth.

#### `src/features/user`
Chứa các màn hình và logic liên quan đến người dùng sau khi đăng nhập, ví dụ như trang chủ, thông tin học viên hoặc các chức năng học tập sau này.

### `src/shared`
Chứa các phần được dùng chung cho nhiều feature, không thuộc riêng một nghiệp vụ nào. Thư mục này phù hợp để đặt utility, helper, storage, component dùng chung hoặc các hàm hỗ trợ tái sử dụng.

#### `src/shared/storage`
Chứa logic lưu trữ dữ liệu local trên thiết bị, ví dụ token đăng nhập, trạng thái người dùng hoặc các dữ liệu cần giữ lại giữa các lần mở app.

## Ý nghĩa tổ chức này
- Giúp code dễ đọc và dễ tìm hơn.
- Mỗi tính năng được tách riêng, dễ mở rộng về sau.
- Giảm việc trộn lẫn giao diện, logic và cấu hình vào cùng một chỗ.
- Dễ chuyển project sang cấu trúc lớn hơn khi app có nhiều màn hình hơn.

## Định hướng khi mở rộng
- Nếu thêm tính năng mới, nên tạo trong `src/features/<ten-feature>`.
- Nếu một đoạn code dùng lại cho nhiều nơi, nên đưa vào `src/shared`.
- Nếu liên quan đến cấu hình chung, đặt trong `src/config`.
- Nếu liên quan đến giao tiếp backend dùng chung, đặt trong `src/api`.
