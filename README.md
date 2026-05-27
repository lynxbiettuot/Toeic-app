# TOEIC App

TOEIC App là một hệ thống hỗ trợ học và luyện thi TOEIC theo mô hình tách 3 phần rõ ràng:

- `Backend`: API server xử lý toàn bộ nghiệp vụ, xác thực, lưu trữ dữ liệu và tính toán logic học tập.
- `Frontend`: ứng dụng mobile cho người học, tập trung vào làm đề, học từ vựng, flashcard và spaced repetition.
- `FrontendWeb`: web admin dành cho quản trị viên để quản lý đề thi, từ vựng, người dùng và dữ liệu hệ thống.

## Mục Tiêu Dự Án

Mục tiêu của dự án là xây dựng một nền tảng học TOEIC có thể dùng được theo cả hai hướng:

1. Người học có thể luyện đề theo format TOEIC, xem lại kết quả và học từ vựng hằng ngày.
2. Quản trị viên có thể quản lý dữ liệu đề thi, bộ từ vựng và người dùng trong cùng một hệ thống.

## Chức Năng Tổng Quan

### 1. Quản lý và luyện thi TOEIC

- import và chỉnh sửa đề thi
- xem danh sách đề, chi tiết đề và câu hỏi theo part
- làm bài theo format ETS
- lưu session làm bài và tính kết quả
- xem lại câu đã sai và phần giải thích

### 2. Quản lý từ vựng bằng Flashcard

- tạo bộ từ vựng mới
- thêm, sửa, xóa flashcard trong bộ
- xem thư viện cá nhân
- xem bộ từ công khai
- import bộ từ công khai vào thư viện riêng

### 3. Ôn tập lặp lại ngắt quãng

- lấy các thẻ đến hạn ôn
- chấm mức độ nhớ theo từng thẻ
- tự động tính lịch ôn tiếp theo
- lưu lịch sử review và thống kê tiến độ học

### 4. Phân tích kết quả và hỗ trợ học tập

- thống kê kết quả làm bài
- hiển thị số liệu học tập trên dashboard
- hỗ trợ AI nhận xét kết quả làm bài
- giúp người học biết điểm mạnh và điểm yếu sau mỗi lần luyện đề

## Công Nghệ Chính

### Backend

- `Node.js`
- `Express`
- `TypeScript`
- `Prisma`
- `MySQL/MariaDB`
- `JWT`
- `bcrypt`
- `nodemailer`
- `@google/genai`

### Frontend mobile

- `Expo`
- `React Native`
- `TypeScript`
- `expo-image-picker`
- `expo-av`
- `AsyncStorage`

### Frontend web admin

- `React`
- `Vite`
- `React Router DOM`
- `xlsx`

### Tích hợp ngoài

- `Cloudinary` cho upload ảnh flashcard
- `Gemini` cho phần nhận xét/giải thích liên quan đến câu hỏi

## Phân Công Thành Viên

| STT | Thành viên | Mã sinh viên | Chức năng phụ trách |
|---|---|---|---|
| 1 | Dương Tuấn Điệp | B22DCCN212 | Quản lý bộ từ vựng và Flashcard; Ôn tập lặp lại ngắt quãng |
| 2 | Hoàng Văn Linh | B22DCCN487 | AI nhận xét kết quả làm bài; Thống kê kết quả làm bài |
| 3 | Lê Đăng Ninh | B22DCCN572 | Admin CRUD đề TOEIC; Admin thống kê người dùng, kết quả |
| 4 | Nguyễn Văn Đạt | B22DCCN199 | Làm đề theo ETS; Xem và làm lại các câu sai |

### Ý nghĩa phân công

- Phần của Dương Tuấn Điệp tập trung vào hệ thống học từ vựng, bao gồm bộ flashcard và cơ chế spaced repetition. Đây là phần giúp người học ôn theo lịch và theo dõi tiến độ học lâu dài.
- Phần của Hoàng Văn Linh tập trung vào xử lý kết quả sau khi làm bài, gồm thống kê và nhận xét bằng AI, để người dùng hiểu rõ hơn về hiệu suất làm bài.
- Phần của Lê Đăng Ninh tập trung vào khu vực quản trị, gồm CRUD đề thi và thống kê phía admin, đảm bảo dữ liệu hệ thống được quản lý tập trung.
- Phần của Nguyễn Văn Đạt tập trung vào trải nghiệm làm đề theo format ETS và chức năng xem lại câu sai, giúp người học luyện tập đúng kiểu đề thực tế.

## Cấu Trúc Dự Án

```text
Toeic-app/
├── Backend/      # API server, Prisma schema, nghiệp vụ flashcard/exam/auth
├── Frontend/     # Ứng dụng mobile cho học viên
└── FrontendWeb/  # Web admin cho quản trị viên
```

### Backend

Backend là lớp xử lý trung tâm của toàn bộ hệ thống. Nó chịu trách nhiệm:

- xác thực người dùng và admin
- truy vấn và cập nhật database
- xử lý luồng flashcard, review, import và public library
- xử lý luồng đề thi, session làm bài và thống kê
- cung cấp API cho mobile và web admin

### Frontend

Ứng dụng mobile là phần người học sử dụng hằng ngày. Các màn hình chính gồm:

- đăng nhập và quản lý phiên
- danh sách bộ flashcard
- chi tiết bộ flashcard
- tìm kiếm bộ công khai
- ôn tập SRS
- làm đề thi và xem lại kết quả

### FrontendWeb

Web admin dành cho người quản trị. Các chức năng chính gồm:

- dashboard
- quản lý người dùng
- quản lý đề thi
- import đề bằng Excel
- quản lý bộ từ vựng hệ thống

## Luồng Chạy Dự Án

Thứ tự chạy hợp lý là:

1. Cài dependency cho từng phần.
2. Cấu hình file môi trường theo README của từng thư mục.
3. Chạy `Backend` trước để API sẵn sàng.
4. Chạy `Frontend` hoặc `FrontendWeb` sau tùy nhu cầu.

Nếu đang test trên điện thoại thật hoặc máy ảo, cần đảm bảo đường dẫn API trong frontend trỏ đúng về backend đang chạy.

## Tài Liệu Chi Tiết Theo Từng Phần

- Backend: [Backend/README.md](Backend/README.md)
- Mobile: [Frontend/README.md](Frontend/README.md)
- Web admin: [FrontendWeb/README.md](FrontendWeb/README.md)

