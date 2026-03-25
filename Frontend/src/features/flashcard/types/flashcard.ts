export type VisibilityMode = 'PRIVATE' | 'PUBLIC';

export type FlashcardSet = {
  id: number;
  owner_user_id: number | null;
  title: string;
  description: string | null;
  visibility: VisibilityMode;
  card_count: number;
  created_at: string;
  updated_at: string | null;
};

export type Flashcard = {
  id: number;
  set_id: number;
  word: string;
  word_type: string | null;
  pronunciation: string | null;
  definition: string;
  example: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ReviewRating = 'FORGOT' | 'HARD' | 'GOOD' | 'EASY';

export type ReviewFlashcard = {
  id: number;
  setId: number;
  setTitle: string;
  word: string;
  pronunciation: string | null;
  definition: string;
  example: string | null;
  reviewState: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewAt: string | null;
  };
};

export type ReviewTodayStats = {
  reviewedCount: number;
  startOfDay: string;
  endOfDay: string;
};

// Public & Discovery types
export type PublicFlashcardSet = {
  id: number;
  title: string;
  description: string | null;
  cardCount: number;
  authorName: string;
  authorId: number | null;
  savedCount: number;
};

export type PublicFlashcardCard = {
  id: number;
  word: string;
  pronunciation: string | null;
  definition: string;
  example: string | null;
  image_url: string | null;
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

