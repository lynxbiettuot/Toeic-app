/**
 * Spaced Review Service
 * API functions for spaced repetition review operations
 */

import type { ReviewFlashcard, ReviewRating, ReviewTodayStats } from '../types';
import { buildUrl, parseJson } from './api-client';

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

export const getDueReviewCards = async (userId: number): Promise<GetDueReviewCardsResponse> => {
  const response = await fetch(buildUrl(`/flashcards/review/due?userId=${userId}`));
  const json = (await response.json()) as { data?: GetDueReviewCardsResponse; message?: string };

  if (!response.ok) {
    throw new Error(json.message || 'Request failed');
  }

  if (!json.data) {
    throw new Error('Invalid response payload');
  }

  return json.data;
};

export const rateReviewCard = async (
  cardId: number,
  userId: number,
  rating: ReviewRating
): Promise<RateReviewCardResponse> => {
  const response = await fetch(buildUrl(`/flashcards/review/${cardId}/rate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, rating })
  });

  return parseJson<RateReviewCardResponse>(response);
};

export const getTodayReviewStats = async (userId: number): Promise<ReviewTodayStats> => {
  const response = await fetch(buildUrl(`/flashcards/review/stats/today?userId=${userId}`));
  return parseJson<ReviewTodayStats>(response);
};

/**
 * Load all user's flashcards from all sets for extra practice
 */
export const getAllUserFlashcards = async (userId: number): Promise<ReviewFlashcard[]> => {
  try {
    const setResponse = await fetch(buildUrl(`/flashcards/sets?userId=${userId}`));
    const setJson = (await setResponse.json()) as { data?: { id: number; title: string }[] };

    if (!setResponse.ok || !setJson.data) {
      throw new Error('Failed to load sets');
    }

    const allCards: ReviewFlashcard[] = [];

    for (const set of setJson.data) {
      const cardResponse = await fetch(buildUrl(`/flashcards/sets/${set.id}/cards?userId=${userId}`));
      const cardJson = (await cardResponse.json()) as {
        data?: { cards: any[] };
      };

      if (cardResponse.ok && cardJson.data?.cards) {
        allCards.push(
          ...cardJson.data.cards.map((card: any) => ({
            id: card.id,
            word: card.word,
            definition: card.definition,
            pronunciation: card.pronunciation,
            example: card.example,
            setId: set.id,
            setTitle: set.title,
            reviewState: {
              nextReviewAt: null,
              intervalDays: 1,
              easeFactor: 2.5,
              repetitions: 0
            }
          }))
        );
      }
    }

    return allCards;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load all flashcards');
  }
};
