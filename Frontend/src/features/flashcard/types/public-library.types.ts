import type { PublicFlashcardCard } from './flashcard-card.types';

export type PublicFlashcardSet = {
  id: number;
  title: string;
  description: string | null;
  cardCount: number;
  authorName: string;
  authorId: number | null;
  savedCount: number;
};

export type PublicFlashcardSetDetail = {
  set: PublicFlashcardSet;
  cards: PublicFlashcardCard[];
};

export type GetPublicSetsResponse = {
  sets: PublicFlashcardSet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};
