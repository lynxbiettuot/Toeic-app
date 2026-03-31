// Constants for API URLs
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

// Biến quản lý trạng thái làm mới token để tránh gọi nhiều lần
let isRefreshing = false;
let refreshSubscribers = [];

function onTokenRefreshed(newAccessToken) {
  refreshSubscribers.map((cb) => cb(newAccessToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

export const apiFetchJson = async (url, options = {}) => {
  const token = localStorage.getItem("toeic_admin_token");
  
  // Only set Content-Type to JSON if body is not FormData
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
    // Nếu bị Unauthorized (401), có thể token đã hết hạn
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

      // Đợi refresh xong rồi thử lại request cũ
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
      // ignore json parse error
    }

    throw new Error(errorMessage);
  }

  return response.json();
};
