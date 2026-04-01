import type { ReviewRating } from './normalizers.js';

export interface NextSchedule {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
  now: Date;
}

/**
 * Build next review schedule based on user rating
 * @param rating - User's rating: FORGOT | HARD | GOOD | EASY
 * @param previousEaseFactor - Previous ease factor (default 2.5)
 * @param previousIntervalDays - Previous interval (default 1)
 * @param previousRepetitions - Previous repetition count (default 0)
 * @returns Next schedule with updated parameters
 */
export const buildNextSchedule = (
  rating: ReviewRating,
  previousEaseFactor: number,
  previousIntervalDays: number,
  previousRepetitions: number
): NextSchedule => {
  const safeEaseFactor = Number.isFinite(previousEaseFactor) ? previousEaseFactor : 2.5;
  const safeIntervalDays = previousIntervalDays > 0 ? previousIntervalDays : 1;
  const safeRepetitions = previousRepetitions >= 0 ? previousRepetitions : 0;

  let easeFactor = safeEaseFactor;
  let intervalDays = safeIntervalDays;
  let repetitions = safeRepetitions;

  // FORGOT: Reset to beginning, reduce ease factor
  if (rating === 'FORGOT') {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, safeEaseFactor - 0.2);
  }

  // HARD: Minimal progress, slightly reduce ease factor
  if (rating === 'HARD') {
    repetitions = safeRepetitions + 1;
    intervalDays = safeRepetitions <= 1 ? 1 : Math.ceil(safeIntervalDays * 1.2);
    easeFactor = Math.max(1.3, safeEaseFactor - 0.15);
  }

  // GOOD: Normal progression, keep ease factor
  if (rating === 'GOOD') {
    repetitions = safeRepetitions + 1;

    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.ceil(safeIntervalDays * safeEaseFactor);
    }
  }

  // EASY: Fast progression, increase ease factor
  if (rating === 'EASY') {
    repetitions = safeRepetitions + 1;
    easeFactor = safeEaseFactor + 0.15;

    if (repetitions === 1) {
      intervalDays = 3;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.ceil(safeIntervalDays * safeEaseFactor * 1.3);
    }
  }

  const now = new Date();
  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return { easeFactor, intervalDays, repetitions, nextReviewAt, now };
};
