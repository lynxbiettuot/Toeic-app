# Frontend TOEIC Mobile

Đây là ứng dụng mobile cho học viên TOEIC. Ứng dụng này tập trung vào:

- đăng nhập và quản lý phiên người dùng
- học và ôn từ vựng bằng flashcard
- public library và import bộ từ vựng
- spaced repetition để ôn lại đúng thời điểm
- xem đề thi, làm bài và xem kết quả

## Công nghệ

- `Expo`
- `React Native`
- `TypeScript`
- `React Native Web`
- `AsyncStorage`
- `expo-image-picker`
- `expo-av`

## Kiến trúc thư mục

- `src/bootstrap`: điều phối toàn bộ màn hình của app.
- `src/features`: từng nhóm nghiệp vụ riêng như auth, exam, flashcard, user.
- `src/shared`: phần dùng chung như storage, API helper, cloudinary.
- `src/config`: cấu hình môi trường và base URL backend.

### Phần flashcard nằm ở đâu?

- `src/features/flashcard/screens`: các màn hình UI.
- `src/features/flashcard/services`: hàm gọi API backend.
- `src/features/flashcard/types`: kiểu dữ liệu cho set/card/review/public library.
- `src/features/flashcard/components`: component dùng chung trong feature.

## Chức năng chính

### Flashcard

- xem thư viện flashcard của tôi
- tạo bộ flashcard mới
- sửa và xóa bộ flashcard
- xem danh sách thẻ trong một bộ
- thêm, sửa, xóa flashcard

### Public set

- xem danh sách bộ từ công khai
- xem chi tiết bộ công khai
- lưu/import bộ public vào thư viện cá nhân

### Spaced Repetition

- lấy thẻ đến hạn ôn
- lật thẻ để xem nghĩa
- chấm rating `FORGOT/HARD/GOOD/EASY`
- tự tính lịch ôn tiếp theo
- luyện tập thêm ngoài danh sách đến hạn

### Exam

- xem danh sách đề thi
- làm bài thi TOEIC
- xem lại kết quả và câu hỏi đã làm

## Cài đặt

### 1. Cài dependency

Chạy trong thư mục `Frontend`:

```bash
npm install
```

### 2. Tạo file môi trường

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Cấu hình `.env`

| Biến | Ý nghĩa | Giá trị mẫu |
|---|---|---|
| `API_BASE_URL` | Địa chỉ backend | `http://10.0.2.2:3000` trên Android Emulator hoặc `http://IP_LAN:3000` trên điện thoại thật |
| `API_PORT` | Port backend | `3000` |
| `EXPO_PUBLIC_CLOUDINARY_URL` | URL upload ảnh Cloudinary | `https://api.cloudinary.com/v1_1/YOUR_NAME/image/upload` |
| `EXPO_PUBLIC_UPLOAD_PRESET` | Upload preset Cloudinary | preset unsigned |

### 4. Chạy ứng dụng

```bash
npm start
```

Một số lệnh hữu ích khác:

```bash
npm run android
npm run ios
npm run web
```

Nếu đổi `.env` mà app chưa nhận cấu hình mới, chạy:

```bash
npx expo start -c
```

## Lưu ý khi chạy

- Backend phải đang chạy trước khi mở app mobile.
- Nếu test trên điện thoại thật, `API_BASE_URL` phải trỏ tới IP LAN của máy đang chạy backend.
- Nếu upload ảnh flashcard, cần cấu hình đúng Cloudinary.
- Ứng dụng dùng token lưu local để duy trì đăng nhập.

## Cấu trúc màn hình chính

- `AppEntry.tsx`: điều phối các màn hình như home, flashcard library, detail, discovery, public detail, spaced review.
- `FlashcardLibraryScreen.tsx`: danh sách bộ thẻ cá nhân và tab khám phá.
- `FlashcardSetDetailScreen.tsx`: danh sách flashcard trong bộ và form tạo/sửa/xóa.
- `DiscoveryScreen.tsx`: màn hình tìm kiếm bộ công khai.
- `PublicSetDetailScreen.tsx`: chi tiết bộ public và nút import.
- `SpacedReviewScreen.tsx`: màn hình ôn tập theo SRS.

## Dữ liệu và API

Frontend gọi backend qua helper ở `src/shared/api/authFetch.ts`.

Các service quan trọng:

- `src/features/flashcard/services/flashcard-set.service.ts`
- `src/features/flashcard/services/flashcard-card.service.ts`
- `src/features/flashcard/services/public-library.service.ts`
- `src/features/flashcard/services/spaced-review.service.ts`

## Khi nào cần đọc thêm file nào?

- Cấu hình backend: `src/config/api.ts`
- Upload ảnh: `src/shared/services/cloudinaryService.ts`
- Kiểu dữ liệu: `src/features/flashcard/types/*`

## Troubleshooting

- Nếu gặp lỗi `Network request failed`, kiểm tra backend đã chạy và `API_BASE_URL` đúng chưa.
- Nếu app trên Expo Go không thấy backend, thử lấy lại IP LAN và chạy lại với cache sạch.
- Nếu ảnh flashcard không upload được, kiểm tra Cloudinary preset và URL.
