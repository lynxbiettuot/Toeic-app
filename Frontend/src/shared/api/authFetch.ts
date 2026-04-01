import { getAccessToken, getRefreshToken, saveAuthTokens, clearAuthData } from '../storage/tokenStorage';
import { API_BASE_URL } from '../../config/api';

// Biến quản lý trạng thái làm mới token để tránh gọi nhiều lần
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(newAccessToken: string) {
  refreshSubscribers.map((cb) => cb(newAccessToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

export async function getAuthHeaders(headers?: HeadersInit): Promise<HeadersInit> {
  const accessToken = await getAccessToken();
  return {
    ...(headers ?? {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

/**
 * Hàm gọi API có tâm của bạn: Tự động xử lý lỗi 401 và Refresh Token
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Chuẩn bị header ban đầu
  const initialHeaders = await getAuthHeaders(init?.headers);
  const response = await fetch(input, {
    ...init,
    headers: initialHeaders,
  });

  // Nếu gặp lỗi 401 (Hết hạn token)
  if (response.status === 401) {
    const refreshToken = await getRefreshToken();

    // Nếu không có refresh token thì buộc đăng xuất
    if (!refreshToken) {
      return response;
    }

    if (!isRefreshing) {
      isRefreshing = true;

      try {
        console.log("Access token expired. Refreshing...");
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await refreshRes.json();

        if (refreshRes.status === 200 && refreshData.accessToken) {
          const newAccessToken = refreshData.accessToken;
          await saveAuthTokens(newAccessToken);

          isRefreshing = false;
          onTokenRefreshed(newAccessToken);
        } else {
          // Refresh thất bại (Refresh token hết hạn)
          isRefreshing = false;
          await clearAuthData();
          return response; // Trả về 401 cũ để App xử lý (ví dụ đá về login)
        }
      } catch (err) {
        isRefreshing = false;
        return response;
      }
    }

    // Nếu đang có một request khác đang refresh, hãy đợi nó xong rồi thử lại
    return new Promise((resolve) => {
      addRefreshSubscriber(async (newToken) => {
        const headers = await getAuthHeaders(init?.headers);
        resolve(fetch(input, { ...init, headers }));
      });
    });
  }

  return response;
}
