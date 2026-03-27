/**
 * Spaced Review Types
 */

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
