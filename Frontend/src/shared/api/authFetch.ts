import { getAccessToken } from '../storage/tokenStorage';
export async function getAuthHeaders(headers?: HeadersInit): Promise<HeadersInit> {
  const accessToken = await getAccessToken();
  return {
    ...(headers ?? {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}
export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = await getAuthHeaders(init?.headers);
  return fetch(input, {
    ...init,
    headers,
  });
}
