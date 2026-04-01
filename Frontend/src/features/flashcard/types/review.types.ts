export type ReviewRating = 'FORGOT' | 'HARD' | 'GOOD' | 'EASY';

export type ReviewFlashcard = {
  id: number;
  setId: number;
  setTitle: string;
  word: string;
  word_type: string | null;
  pronunciation: string | null;
  definition: string;
  example: string | null;
  image_url: string | null;
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
