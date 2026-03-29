/**
 * Dịch vụ hỗ trợ upload ảnh lên Cloudinary (Unsigned upload)
 */

// Bạn có thể thay đổi các giá trị này theo cấu hình Cloudinary của mình
const CLOUDINARY_URL = process.env.EXPO_PUBLIC_CLOUDINARY_URL;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_UPLOAD_PRESET;

export const uploadToCloudinary = async (imageUri: string): Promise<string | null> => {
  try {
    const formData = new FormData();

    // Tên file và định dạng
    const filename = imageUri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    console.log("Cloudinary Upload Start:", CLOUDINARY_URL);
    console.log("Using Preset:", UPLOAD_PRESET);

    // Bắt buộc phải có 2 trường này cho Unsigned Upload
    formData.append('upload_preset', UPLOAD_PRESET);
    // @ts-ignore
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    });

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (data.secure_url) {
      console.log("Upload Success:", data.secure_url);
      return data.secure_url;
    } else {
      console.error("Cloudinary Detailed Error:", JSON.stringify(data));
      return null;
    }
  } catch (error) {
    console.error("Upload to Cloudinary failed:", error);
    return null;
  }
};
