import type { GetPublicSetsResponse, PublicFlashcardSetDetail } from '../types';
import { authFetch, buildUrl, parseJson } from './api-client';

// Gọi API backend để lấy danh sách các bộ flashcard công khai.
export const getPublicFlashcardSets = async (
  page: number = 1,
  limit: number = 10,
  search: string = '',
  userId: number | null = null
): Promise<GetPublicSetsResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
    ...(userId ? { userId: String(userId) } : {})
  });
  const response = await authFetch(buildUrl(`/flashcards/public?${params}`));
  return parseJson<GetPublicSetsResponse>(response);
};

// Gọi API backend để lấy chi tiết của một bộ flashcard công khai.
export const getPublicFlashcardSetDetail = async (
  setId: number
): Promise<PublicFlashcardSetDetail> => {
  const response = await authFetch(buildUrl(`/flashcards/public/${setId}`));
  return parseJson<PublicFlashcardSetDetail>(response);
};

// Gọi API backend để import bộ công khai vào thư viện cá nhân.
export const importFlashcardSet = async (
  setId: number,
  userId: number
): Promise<{ setId: number; message: string }> => {
  const response = await authFetch(buildUrl(`/flashcards/public/${setId}/import?userId=${userId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  return parseJson<{ setId: number; message: string }>(response);
};