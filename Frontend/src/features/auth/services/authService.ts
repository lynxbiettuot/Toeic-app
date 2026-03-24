import { API_BASE_URL } from '../../../config/api';

export type AuthResponse = {
  message?: string;
  statusCode?: number;
  accessToken?: string;
  refreshToken?: string;
  userData?: Record<string, unknown>;
  data?: Record<string, unknown>;
  email?: string;
};

const buildUrl = (path: string) => {
  const normalizedBase = API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.replace(/^\//, '');
  return `${normalizedBase}/${normalizedPath}`;
};

const postJson = async (path: string, payload: Record<string, unknown>): Promise<AuthResponse> => {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as AuthResponse;

  if (!response.ok) {
    throw new Error(json.message || 'Request failed.');
  }

  return json;
};

export const loginUser = (payload: { email: string; password: string }) =>
  postJson('/auth/login/user', payload);

export const signupUser = (payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) => postJson('/auth/signup', payload);

export const requestPasswordOtp = (payload: { email: string }) =>
  postJson('/auth/forgot-password/user', payload);

export const resetPasswordUser = (payload: {
  email: string;
  otpVerify: string;
  newPassword: string;
  confirmNewPassword: string;
}) => postJson('/auth/reset-password/user', payload);
