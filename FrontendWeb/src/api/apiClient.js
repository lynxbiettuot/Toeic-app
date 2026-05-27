// Các base URL dùng chung cho tất cả API trong khu admin.
export const API_ROOT = "http://localhost:3000/admin";
export const EXAM_API_BASE_URL = `${API_ROOT}/exams`;
export const DASHBOARD_API_BASE_URL = `${API_ROOT}/dashboard`;
export const VOCAB_API_BASE_URL = `${API_ROOT}/vocab-sets`;

export const EXAM_STATUS_FILTERS = [
  { value: "ACTIVE", label: "Mặc định" },
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
];

export const VOCAB_STATUS_FILTERS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
];

export const TABLE_PAGE_SIZE = 5;

export const ADMIN_ACCOUNTS = [
  {
    email: "admin@gmail.com",
    password: "1234",
    name: "Admin mặc định",
  },
  {
    email: "manager@gmail.com",
    password: "1234",
    name: "Admin quản lý",
  },
];

// Biến cờ dùng để tránh gọi refresh token nhiều lần cùng lúc.
let isRefreshing = false;
let refreshSubscribers = [];

// Gọi callback đã chờ để dùng token mới.
function onTokenRefreshed(newAccessToken) {
  refreshSubscribers.map((cb) => cb(newAccessToken));
  refreshSubscribers = [];
}

// Lưu callback để retry request sau khi refresh thành công.
function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

// Wrapper fetch JSON có gắn Bearer token và tự động refresh khi 401.
export const apiFetchJson = async (url, options = {}) => {
  const token = localStorage.getItem("toeic_admin_token");
  
  // Chỉ set Content-Type = application/json khi body không phải FormData.
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Nếu server trả 401 thì thử refresh token trước khi báo lỗi.
    if (response.status === 401 && !url.includes("/auth/login")) {
      const refreshToken = localStorage.getItem("toeic_admin_refresh_token");
      
      if (!refreshToken) {
        localStorage.removeItem("toeic_admin_token");
        window.location.hash = "/login";
        throw new Error("Phiên đăng nhập hết hạn.");
      }

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          // Gọi API refresh token của backend để lấy access token mới.
          const refreshRes = await fetch("http://localhost:3000/auth/refresh-token", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshData = await refreshRes.json();

          if (refreshRes.status === 200 && refreshData.accessToken) {
            const newAccessToken = refreshData.accessToken;
            localStorage.setItem("toeic_admin_token", newAccessToken);
            
            isRefreshing = false;
            onTokenRefreshed(newAccessToken);
          } else {
            isRefreshing = false;
            localStorage.removeItem("toeic_admin_token");
            localStorage.removeItem("toeic_admin_refresh_token");
            window.location.hash = "/login";
            throw new Error("Phiên đăng nhập hết hạn.");
          }
        } catch (err) {
          isRefreshing = false;
          window.location.hash = "/login";
          throw err;
        }
      }

      // Chờ refresh xong rồi retry request gốc bằng token mới.
      return new Promise((resolve) => {
        addRefreshSubscriber(async (newToken) => {
          const retryHeaders = {
            ...headers,
            "Authorization": `Bearer ${newToken}`
          };
          resolve(apiFetchJson(url, { ...options, headers: retryHeaders }));
        });
      });
    }

    let errorMessage = "Request failed.";
    try {
      const errorResult = await response.json();
      errorMessage = errorResult?.message || errorMessage;
    } catch {
      // Bỏ qua lỗi parse JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};
