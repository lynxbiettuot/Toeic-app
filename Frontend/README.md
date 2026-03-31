# Frontend TOEIC Mobile

> [!CAUTION]
> **Lưu ý quan trọng (Git):** Nên tạo một nhánh phụ dưới local phân thân từ nhánh chính, sau đó pull về nhánh phụ để nếu migrate database thì nhánh chính ở local vẫn ổn. Ngoài ra cần commit cái lần chạy thành công hiện tại trước khi pull về để có thể roll back nếu có lỗi.

## Các bước thiết lập ban đầu

### 1. Cài đặt Dependency
**Đây là bước đầu tiên và bắt buộc.**
```bash
npm install
```

### 2. Cấu hình Biến môi trường (.env)
Sao chép file `.env.example` thành `.env` và điền đầy đủ thông tin:
```bash
cp .env.example .env
```

| Biến | Ý nghĩa | Cách cấu hình |
| :--- | :--- | :--- |
| `API_BASE_URL` | Địa chỉ Backend | 
**Máy ảo (Android Studio):** `http://10.0.2.2:3000`
**Máy thật (Expo Go):** `http://IP_LAN:3000` |
| `API_PORT` | Port Backend | Mặc định: `3000` |
| `EXPO_PUBLIC_CLOUDINARY_URL` | Cloudinary API | 
`https://api.cloudinary.com/v1_1/YOUR_NAME/image/upload` |
| `EXPO_PUBLIC_UPLOAD_PRESET` | Upload Preset | Lấy trong Settings Cloudinary (Unsigned) |

### 3. Hướng dẫn lấy IP LAN (Cho máy thật)
Nếu bạn chạy ứng dụng trên điện thoại thật bằng Expo Go, bạn cần dùng IP LAN của máy tính:
1. Mở PowerShell/Command Prompt gõ: `ipconfig`.
2. Tìm dòng `IPv4 Address` (ví dụ `192.168.1.5`).
3. Điền vào `.env`: `API_BASE_URL=http://192.168.1.5:3000`.

### 4. Cấu hình Cloudinary (Để đổi ảnh đại diện)
1. Đăng ký [Cloudinary](https://cloudinary.com/).
2. Lấy **Cloud Name** tại Dashboard.
3. Vào **Settings -> Upload -> Add upload preset**.
4. Chuyển **Signing Mode** sang **`Unsigned`**. Nhấn **Save**.
5. Copy tên Preset vừa tạo và dán vào `EXPO_PUBLIC_UPLOAD_PRESET`.

### 5. Khởi chạy Ứng dụng

Bạn có 2 câu lệnh chính để khởi chạy:

*   **Chạy thông thường:**
    ```bash
    npm start
    ```
*   **Chạy xóa Cache (Khuyên dùng khi sửa .env):**
    ```bash
    npx expo start -c
    ```
    *Lưu ý: Dùng `-c` (clear) để ép Expo đọc lại các thay đổi mới nhất từ file `.env` hoặc khi cấu hình không nhận.*

---

## Hướng dẫn xử lý khi bị "Treo" (Troubleshooting)

Nếu bạn quét mã QR hoặc mở máy ảo mà bị treo ở màn hình **"Reloading..."** hoặc **"Network request failed"**, hãy thử các bước sau:

1.  **Nhấn phím `r`:** Tại cửa sổ Terminal đang chạy Expo, nhấn phím `r` để ép ứng dụng nạp lại mã nguồn.(thông thường treo là do còn cache cũ nên cứ chạy npx expo start -c là được, nếu không mới xuống dưới)
2.  **Kiểm tra Tường lửa (Firewall):** Tắt tạm Windows Firewall vì nó có thể chặn cổng `8081` (của Expo) hoặc `3000` (của Backend).
3.  **Dùng chế độ Tunnel (Cực kỳ hiệu quả khi mạng yếu/lỗi IP):**
    Nếu lỗi IP LAN vẫn tiếp diễn, hãy dùng lệnh:
    ```bash
    npx expo start --tunnel
    ```
    Cách này sẽ tạo một đường ống bảo mật chạy qua internet, bỏ qua mọi rắc rối về mạng nội bộ.

---

- Nhấn **`a`** để mở trên **Máy ảo (Android Studio)**.
- Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại để chạy **Máy thật**.

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
