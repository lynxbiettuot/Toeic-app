/**
 * Helper functions for Flashcard feature
 * Business logic utilities for flashcard operations
 */

import { prisma } from '../../lib/prisma.js';

/**
 * Count how many flashcards are due for review
 * @param userId - User ID to check
 * @param now - Current date/time
 * @returns Count of due cards
 */
export const countDueCards = async (userId: number, now: Date): Promise<number> => {
  return prisma.flashcards.count({
    where: {
      set: {
        user: { id: userId }
      },
      OR: [
        {
          spaced: {
            none: {
              user_id: userId
            }
          }
        },
        {
          spaced: {
            some: {
              user_id: userId,
              OR: [{ next_review_at: null }, { next_review_at: { lte: now } }]
            }
          }
        }
      ]
    }
  });
};

/**
 * Update card count in a flashcard set
 * @param setId - Set ID to update
 */
export const updateCardCount = async (setId: number): Promise<void> => {
  const cardCount = await prisma.flashcards.count({
    where: { set_id: setId }
  });

  await prisma.flashcard_sets.update({
    where: { id: setId },
    data: { card_count: cardCount }
  });
};

/**
 * Verify ownership of a flashcard set
 * @param setId - Set ID to check ownership
 * @param userId - User ID to verify
 * @returns Set data and error if ownership check fails
 */
export const ensureOwnership = async (
  setId: number,
  userId: number
): Promise<{
  set: any | null;
  error: { statusCode: number; message: string } | null;
}> => {
  const set = await prisma.flashcard_sets.findUnique({
    where: { id: setId }
  });

  if (!set) {
    return {
      set: null,
      error: {
        statusCode: 404,
        message: 'Không tìm thấy bộ từ vựng.'
      }
    };
  }

  if (set.owner_user_id !== userId) {
    return {
      set: null,
      error: {
        statusCode: 403,
        message: 'Bạn không có quyền thao tác với bộ từ vựng này.'
      }
    };
  }

  return { set, error: null };
};
