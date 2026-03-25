# Frontend README

## Cách chạy nhanh

### Đây là frontend của mobile
Project `Frontend` là phần giao diện cho ứng dụng TOEIC trên điện thoại, được xây dựng bằng `Expo + React Native`.

Bạn có thể chạy app theo 2 cách:
- dùng `Expo Go` trên điện thoại thật
- dùng máy ảo Android Studio

Trong project này, cách nhẹ và dễ nhất là dùng `Expo Go`, không bắt buộc phải cài máy ảo Android Studio.

### 1. Cài dependency
```bash
npm install
```

### 2. Tạo file môi trường
```bash
cp .env.example .env
```

Nếu đang dùng Windows PowerShell, có thể dùng:

```powershell
Copy-Item .env.example .env
```

### 3. Cấu hình backend để điện thoại thấy được Giao diện
Frontend mobile muốn gọi được backend trên điện thoại thì điện thoại phải truy cập được địa chỉ IP LAN của máy tính đang chạy backend.

#### Cách cấu hình
1. Chạy backend trước ở cổng `3000`.
2. Đảm bảo điện thoại và máy tính cùng một mạng Wi-Fi.
3. Lấy IP LAN của máy tính:

```powershell
ipconfig
```

4. Tìm dòng `IPv4 Address`, ví dụ `192.168.2.114`.
5. Mở file `.env` của frontend và sửa thành:

```env
API_BASE_URL=http:192.168.2.114:3000
API_PORT=3000
```

Lưu ý:
- Thay `192.168.2.114` bằng IP thật của máy bạn.
- Không dùng `localhost` hoặc `127.0.0.1` khi chạy trên điện thoại thật, vì lúc đó app sẽ hiểu là chính điện thoại.
- Nếu backend đổi cổng, cập nhật lại cả `API_BASE_URL` và `API_PORT`.

### 4. Cài Expo Go trên điện thoại
Tải ứng dụng `Expo Go`:
- Android: cài từ Google Play
- iPhone: cài từ App Store

### 5. Chạy frontend
```bash
npm start
```

Sau khi chạy, Expo sẽ mở `Metro Bundler` và hiển thị mã QR trong terminal hoặc trên trang Expo Dev Tools.

### 6. Mở app trên Expo Go
1. Mở `Expo Go` trên điện thoại.
2. Quét QR code từ terminal hoặc trình duyệt.
3. App sẽ được load trực tiếp trên điện thoại.

Nếu quét QR nhưng không vào được app:
- kiểm tra điện thoại và máy tính có cùng Wi-Fi không
- kiểm tra backend có đang chạy không
- kiểm tra `API_BASE_URL` đã đúng IP LAN chưa
- kiểm tra tường lửa Windows có đang chặn cổng `3000` hoặc Expo không

## Cách để thấy frontend trên Expo Go

Project này đã có logic tự suy ra địa chỉ backend từ mạng nội bộ trong file `src/config/api.ts`. Tuy nhiên để ổn định nhất khi chạy trên điện thoại thật, nên cấu hình rõ trong `.env`.

Luồng hoạt động khi dùng Expo Go:
1. Bạn chạy backend trên máy tính.
2. Bạn chạy frontend bằng `npm start`.
3. Expo phát app qua mạng nội bộ.
4. Điện thoại mở app bằng `Expo Go`.
5. Frontend đọc `API_BASE_URL` từ `app.config.js`.
6. Frontend gọi API đến backend qua địa chỉ dạng `http://IP_MAY_TINH:3000`.
7. Giao diện mobile hiển thị trên điện thoại.

## Khi nào cần Android Studio
Bạn chỉ cần Android Studio nếu:
- muốn chạy máy ảo Android
- muốn test sâu hơn với emulator
- muốn build native hoặc debug các vấn đề đặc thù Android

Nếu mục tiêu hiện tại chỉ là xem và test frontend mobile nhanh, `Expo Go` là đủ.

## Tổng quan
Đây là frontend mobile được xây dựng bằng `Expo + React Native`. Các file trong `src` được tổ chức theo từng nhóm chức năng để dễ quản lý, dễ mở rộng và tách riêng giao diện, logic và cấu hình.

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
