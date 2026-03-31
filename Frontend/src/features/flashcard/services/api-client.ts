import { API_BASE_URL } from '../../../config/api';
import { authFetch } from '../../../shared/api/authFetch';

export type ApiResponse<T> = {
  statusCode?: number;
  message?: string;
  data?: T;
};

export const buildUrl = (path: string): string => {
  const normalizedBase = API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.replace(/^\//, '');
  return `${normalizedBase}/${normalizedPath}`;
};

export const parseJson = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(json.message || 'Request failed');
  }

  if (json.data === undefined) {
    throw new Error('Invalid response payload');
  }

  return json.data;
};

export { authFetch };

