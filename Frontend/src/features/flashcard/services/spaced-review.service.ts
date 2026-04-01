import type { ReviewFlashcard, ReviewRating, ReviewTodayStats } from '../types';
import { authFetch, buildUrl, parseJson } from './api-client';

export interface GetDueReviewCardsResponse {
  cards: ReviewFlashcard[];
  dueCount: number;
  now: string;
}

export interface RateReviewCardResponse {
  nextReviewAt: string;
  intervalDays: number;
  repetitions: number;
  dueCount: number;
}

const normalizeReviewCard = (card: any): ReviewFlashcard => ({
  id: card.id,
  setId: card.setId,
  setTitle: card.setTitle,
  word: card.word,
  word_type: card.word_type ?? card.wordType ?? null,
  pronunciation: card.pronunciation ?? null,
  definition: card.definition,
  example: card.example ?? null,
  image_url: card.image_url ?? card.imageUrl ?? null,
  reviewState: {
    nextReviewAt: card.reviewState?.nextReviewAt ?? null,
    intervalDays: card.reviewState?.intervalDays ?? 1,
    easeFactor: card.reviewState?.easeFactor ?? 2.5,
    repetitions: card.reviewState?.repetitions ?? 0
  }
});

export const getDueReviewCards = async (userId: number): Promise<GetDueReviewCardsResponse> => {
  const response = await authFetch(buildUrl(`/flashcards/review/due?userId=${userId}`));
  const json = (await response.json()) as { data?: GetDueReviewCardsResponse; message?: string };

  if (!response.ok) {
    throw new Error(json.message || 'Request failed');
  }

  if (!json.data) {
    throw new Error('Invalid response payload');
  }

  return {
    ...json.data,
    cards: json.data.cards.map((card) => normalizeReviewCard(card))
  };
};

export const rateReviewCard = async (
  cardId: number,
  userId: number,
  rating: ReviewRating
): Promise<RateReviewCardResponse> => {
  const response = await authFetch(buildUrl(`/flashcards/review/${cardId}/rate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, rating })
  });

  return parseJson<RateReviewCardResponse>(response);
};

export const getTodayReviewStats = async (userId: number): Promise<ReviewTodayStats> => {
  const response = await authFetch(buildUrl(`/flashcards/review/stats/today?userId=${userId}`));
  return parseJson<ReviewTodayStats>(response);
};

export const getPracticeCards = async (userId: number, limit: number = 50): Promise<ReviewFlashcard[]> => {
  try {
    const response = await authFetch(
      buildUrl(`/flashcards/practice?userId=${userId}&limit=${limit}`)
    );
    const json = await response.json();

    if (!response.ok || !json.data) {
      throw new Error('Failed to load practice flashcards');
    }

    return json.data.cards.map((card: any) => ({
      id: card.id,
      word: card.word,
      word_type: card.word_type ?? null,
      definition: card.definition,
      pronunciation: card.pronunciation,
      example: card.example,
      image_url: card.image_url,
      setId: card.setId,
      setTitle: card.setTitle,
      // Khởi tạo trạng thái mặc định cho các thẻ luyện tập chay
      reviewState: {
        nextReviewAt: null, intervalDays: 1, easeFactor: 2.5, repetitions: 0
      }
    }));
  } catch (error) {
    throw new Error('Không thể tải danh sách luyện tập');
  }
};


