import type { FlashcardSet, VisibilityMode } from '../types';
import { authFetch, buildUrl, parseJson } from './api-client';

// Gọi API backend để lấy danh sách bộ flashcard của người dùng.
export const getFlashcardSets = async (userId: number): Promise<FlashcardSet[]> => {
  const response = await authFetch(buildUrl(`/flashcards/sets?userId=${userId}`));
  return parseJson<FlashcardSet[]>(response);
};

// Gọi API backend để tạo một bộ flashcard mới.
export const createFlashcardSet = async (
  userId: number,
  payload: { title: string; description: string; visibility: VisibilityMode }
): Promise<FlashcardSet> => {
  const response = await authFetch(buildUrl('/flashcards/sets'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<FlashcardSet>(response);
};

// Gọi API backend để cập nhật thông tin bộ flashcard.
export const updateFlashcardSet = async (
  setId: number,
  userId: number,
  payload: { title: string; description: string; visibility: VisibilityMode }
): Promise<FlashcardSet> => {
  const response = await authFetch(buildUrl(`/flashcards/sets/${setId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<FlashcardSet>(response);
};

// Gọi API backend để xóa bộ flashcard theo setId.
export const deleteFlashcardSet = async (setId: number, userId: number): Promise<void> => {
  const response = await authFetch(buildUrl(`/flashcards/sets/${setId}?userId=${userId}`), {
    method: 'DELETE'
  });

  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    throw new Error(json.message || 'Delete failed');
  }
};

