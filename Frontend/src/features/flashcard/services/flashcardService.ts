import { API_BASE_URL } from '../../../config/api';
import type {
  Flashcard,
  FlashcardSet,
  ReviewFlashcard,
  ReviewRating,
  ReviewTodayStats,
  VisibilityMode,
  GetPublicSetsResponse,
  PublicFlashcardSetDetail
} from '../types/flashcard';

type ApiResponse<T> = {
  statusCode?: number;
  message?: string;
  data?: T;
};

const buildUrl = (path: string) => {
  const normalizedBase = API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.replace(/^\//, '');
  return `${normalizedBase}/${normalizedPath}`;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(json.message || 'Request failed');
  }

  if (json.data === undefined) {
    throw new Error('Invalid response payload');
  }

  return json.data;
};

export const getFlashcardSets = async (userId: number) => {
  const response = await fetch(buildUrl(`/flashcards/sets?userId=${userId}`));
  return parseJson<FlashcardSet[]>(response);
};

export const createFlashcardSet = async (
  userId: number,
  payload: { title: string; description: string; visibility: VisibilityMode }
) => {
  const response = await fetch(buildUrl('/flashcards/sets'), {
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
) => {
  const response = await fetch(buildUrl(`/flashcards/sets/${setId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<FlashcardSet>(response);
};

export const deleteFlashcardSet = async (setId: number, userId: number) => {
  const response = await fetch(buildUrl(`/flashcards/sets/${setId}?userId=${userId}`), {
    method: 'DELETE'
  });

  if (!response.ok) {
    const json = (await response.json()) as ApiResponse<null>;
    throw new Error(json.message || 'Delete failed');
  }
};

export const getFlashcardsBySet = async (setId: number, userId: number) => {
  const response = await fetch(buildUrl(`/flashcards/sets/${setId}/cards?userId=${userId}`));
  const json = (await response.json()) as ApiResponse<{ set: FlashcardSet; cards: Flashcard[] }>;

  if (!response.ok) {
    throw new Error(json.message || 'Request failed');
  }

  if (!json.data) {
    throw new Error('Invalid response payload');
  }

  return json.data;
};

export const createFlashcard = async (
  setId: number,
  userId: number,
  payload: {
    word: string;
    wordType: string;
    pronunciation: string;
    definition: string;
    example: string;
  }
) => {
  const response = await fetch(buildUrl(`/flashcards/sets/${setId}/cards`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<Flashcard>(response);
};

export const updateFlashcard = async (
  cardId: number,
  userId: number,
  payload: {
    word: string;
    wordType: string;
    pronunciation: string;
    definition: string;
    example: string;
  }
) => {
  const response = await fetch(buildUrl(`/flashcards/cards/${cardId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<Flashcard>(response);
};

export const deleteFlashcard = async (cardId: number, userId: number) => {
  const response = await fetch(buildUrl(`/flashcards/cards/${cardId}?userId=${userId}`), {
    method: 'DELETE'
  });

  if (!response.ok) {
    const json = (await response.json()) as ApiResponse<null>;
    throw new Error(json.message || 'Delete failed');
  }
};

export const getDueReviewCards = async (userId: number) => {
  const response = await fetch(buildUrl(`/flashcards/review/due?userId=${userId}`));
  const json = (await response.json()) as ApiResponse<{
    cards: ReviewFlashcard[];
    dueCount: number;
    now: string;
  }>;

  if (!response.ok) {
    throw new Error(json.message || 'Request failed');
  }

  if (!json.data) {
    throw new Error('Invalid response payload');
  }

  return json.data;
};

export const rateReviewCard = async (cardId: number, userId: number, rating: ReviewRating) => {
  const response = await fetch(buildUrl(`/flashcards/review/${cardId}/rate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, rating })
  });

  return parseJson<{
    nextReviewAt: string;
    intervalDays: number;
    repetitions: number;
    dueCount: number;
  }>(response);
};

export const getTodayReviewStats = async (userId: number) => {
  const response = await fetch(buildUrl(`/flashcards/review/stats/today?userId=${userId}`));
  return parseJson<ReviewTodayStats>(response);
};

export const getPublicFlashcardSets = async (page: number = 1, limit: number = 10, search: string = '') => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
  const response = await fetch(buildUrl(`/flashcards/public?${params}`));
  return parseJson<GetPublicSetsResponse>(response);
};

export const getPublicFlashcardSetDetail = async (setId: number) => {
  const response = await fetch(buildUrl(`/flashcards/public/${setId}`));
  return parseJson<PublicFlashcardSetDetail>(response);
};

export const importFlashcardSet = async (setId: number, userId: number) => {
  const response = await fetch(buildUrl(`/flashcards/public/${setId}/import?userId=${userId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  return parseJson<{ setId: number; message: string }>(response);
};
