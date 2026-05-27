import type { Flashcard, FlashcardSet } from '../types';
import { authFetch, buildUrl, parseJson } from './api-client';

export interface GetFlashcardsBySetResponse {
  set: FlashcardSet;
  cards: Flashcard[];
}

// Lấy toàn bộ flashcard thuộc một bộ để hiển thị trong màn hình chi tiết.
export const getFlashcardsBySet = async (
  setId: number,
  userId: number
): Promise<GetFlashcardsBySetResponse> => {
  const response = await authFetch(buildUrl(`/flashcards/sets/${setId}/cards?userId=${userId}`));
  const json = (await response.json()) as { data?: GetFlashcardsBySetResponse; message?: string };

  if (!response.ok) {
    throw new Error(json.message || 'Request failed');
  }

  if (!json.data) {
    throw new Error('Invalid response payload');
  }

  return json.data;
};

// Tạo mới một flashcard trong bộ hiện tại.
export const createFlashcard = async (
  setId: number,
  userId: number,
  payload: {
    word: string;
    wordType: string;
    pronunciation: string;
    definition: string;
    example: string;
    imageUrl: string;
  }
): Promise<Flashcard> => {
  const response = await authFetch(buildUrl(`/flashcards/sets/${setId}/cards`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<Flashcard>(response);
};

// Cập nhật nội dung của một flashcard đã tồn tại.
export const updateFlashcard = async (
  cardId: number,
  userId: number,
  payload: {
    word: string;
    wordType: string;
    pronunciation: string;
    definition: string;
    example: string;
    imageUrl: string;
  }
): Promise<Flashcard> => {
  const response = await authFetch(buildUrl(`/flashcards/cards/${cardId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<Flashcard>(response);
};

// Xóa flashcard khỏi bộ hiện tại.
export const deleteFlashcard = async (cardId: number, userId: number): Promise<void> => {
  const response = await authFetch(buildUrl(`/flashcards/cards/${cardId}?userId=${userId}`), {
    method: 'DELETE'
  });

  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    throw new Error(json.message || 'Delete failed');
  }
};

