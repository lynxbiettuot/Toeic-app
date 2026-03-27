/**
 * Flashcard Card Service
 * API functions for flashcard card CRUD operations
 */

import type { Flashcard, FlashcardSet } from '../types';
import { buildUrl, parseJson } from './api-client';

export interface GetFlashcardsBySetResponse {
  set: FlashcardSet;
  cards: Flashcard[];
}

export const getFlashcardsBySet = async (
  setId: number,
  userId: number
): Promise<GetFlashcardsBySetResponse> => {
  const response = await fetch(buildUrl(`/flashcards/sets/${setId}/cards?userId=${userId}`));
  const json = (await response.json()) as { data?: GetFlashcardsBySetResponse; message?: string };

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
): Promise<Flashcard> => {
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
): Promise<Flashcard> => {
  const response = await fetch(buildUrl(`/flashcards/cards/${cardId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...payload })
  });

  return parseJson<Flashcard>(response);
};

export const deleteFlashcard = async (cardId: number, userId: number): Promise<void> => {
  const response = await fetch(buildUrl(`/flashcards/cards/${cardId}?userId=${userId}`), {
    method: 'DELETE'
  });

  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    throw new Error(json.message || 'Delete failed');
  }
};
