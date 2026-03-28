/**
 * Normalizers for Flashcard feature
 * Handle data normalization and type conversions
 */

export type ReviewRating = 'FORGOT' | 'HARD' | 'GOOD' | 'EASY';
export type VisibilityMode = 'PUBLIC' | 'PRIVATE';

export const normalizeRating = (value: unknown): ReviewRating | null => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (raw === 'FORGOT' || raw === 'HARD' || raw === 'GOOD' || raw === 'EASY') {
    return raw;
  }
  return null;
};

export const normalizeVisibility = (value: unknown): VisibilityMode => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : 'PRIVATE';
  return raw === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
};

export const normalizeWordType = (value: unknown): string | null => {
  return typeof value === 'string' ? value.trim() || null : null;
};

export const normalizePronunciation = (value: unknown): string | null => {
  return typeof value === 'string' ? value.trim() || null : null;
};

export const normalizeExample = (value: unknown): string | null => {
  return typeof value === 'string' ? value.trim() || null : null;
};

export const normalizeImageUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const url = value.trim();

  if (!url) {
    return null;
  }

  return /^https?:\/\//i.test(url) ? url : null;
};
