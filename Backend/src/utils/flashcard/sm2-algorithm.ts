import type { ReviewRating } from './normalizers.js';

export interface NextSchedule {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
  now: Date;
}

// Tính lịch ôn tiếp theo theo thuật toán SM-2 dựa trên mức đánh giá của người dùng.
// @param rating - Mức đánh giá của user: FORGOT | HARD | GOOD | EASY.
// @param previousEaseFactor - Hệ số dễ nhớ trước đó (mặc định 2.5).
// @param previousIntervalDays - Khoảng lặp trước đó (mặc định 1).
// @param previousRepetitions - Số lần lặp trước đó (mặc định 0).
// @returns Lịch ôn mới sau khi tính toán.
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

  // FORGOT: Reset về mốc ban đầu và giảm hệ số dễ nhớ.
  if (rating === 'FORGOT') {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, safeEaseFactor - 0.2);
  }

  // HARD: Tiến triển ít, giảm nhẹ hệ số dễ nhớ.
  if (rating === 'HARD') {
    repetitions = safeRepetitions + 1;
    intervalDays = safeRepetitions <= 1 ? 1 : Math.ceil(safeIntervalDays * 1.2);
    easeFactor = Math.max(1.3, safeEaseFactor - 0.15);
  }

  // GOOD: Tiến triển bình thường, giữ nguyên hệ số dễ nhớ.
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

  // EASY: Tiến triển nhanh, tăng hệ số dễ nhớ.
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
