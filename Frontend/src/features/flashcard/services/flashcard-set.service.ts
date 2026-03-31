import type { FlashcardSet, VisibilityMode } from '../types';
import { authFetch, buildUrl, parseJson } from './api-client';

export const getFlashcardSets = async (userId: number): Promise<FlashcardSet[]> => {
  const response = await authFetch(buildUrl(`/flashcards/sets?userId=${userId}`));
  return parseJson<FlashcardSet[]>(response);
};

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

export const deleteFlashcardSet = async (setId: number, userId: number): Promise<void> => {
  const response = await authFetch(buildUrl(`/flashcards/sets/${setId}?userId=${userId}`), {
    method: 'DELETE'
  });

  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    throw new Error(json.message || 'Delete failed');
  }
};

