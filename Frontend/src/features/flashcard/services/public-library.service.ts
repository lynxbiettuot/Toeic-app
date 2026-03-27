/**
 * Public Library Service
 * API functions for browsing and importing public flashcard sets
 */

import type { GetPublicSetsResponse, PublicFlashcardSetDetail } from '../types';
import { buildUrl, parseJson } from './api-client';

export const getPublicFlashcardSets = async (
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<GetPublicSetsResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
  const response = await fetch(buildUrl(`/flashcards/public?${params}`));
  return parseJson<GetPublicSetsResponse>(response);
};

export const getPublicFlashcardSetDetail = async (
  setId: number
): Promise<PublicFlashcardSetDetail> => {
  const response = await fetch(buildUrl(`/flashcards/public/${setId}`));
  return parseJson<PublicFlashcardSetDetail>(response);
};

export const importFlashcardSet = async (
  setId: number,
  userId: number
): Promise<{ setId: number; message: string }> => {
  const response = await fetch(buildUrl(`/flashcards/public/${setId}/import?userId=${userId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  return parseJson<{ setId: number; message: string }>(response);
};
