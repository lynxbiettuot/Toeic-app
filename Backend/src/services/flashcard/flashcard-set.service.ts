/**
 * Flashcard Set Service
 * Business logic for CRUD operations on flashcard sets
 */

import { prisma } from '../../lib/prisma.js';
import { ensureOwnership } from '../../utils/flashcard/index.js';

export const getUserFlashcardSets = async (userId: number) => {
  return prisma.flashcard_sets.findMany({
    where: {
      owner_user_id: userId,
      deleted_at: null
    },
    orderBy: { created_at: 'desc' }
  });
};

export const createFlashcardSet = async (
  userId: number,
  title: string,
  description: string | null,
  visibility: 'PUBLIC' | 'PRIVATE'
) => {
  return prisma.flashcard_sets.create({
    data: {
      owner_user_id: userId,
      title,
      description,
      visibility
    }
  });
};

export const updateFlashcardSet = async (
  setId: number,
  userId: number,
  title: string,
  description: string | null,
  visibility: 'PUBLIC' | 'PRIVATE'
) => {
  const { error } = await ensureOwnership(setId, userId);

  if (error) {
    throw new Error(`${error.statusCode}: ${error.message}`);
  }

  return prisma.flashcard_sets.update({
    where: { id: setId },
    data: {
      title,
      description,
      visibility,
      updated_at: new Date()
    }
  });
};

export const deleteFlashcardSet = async (setId: number, userId: number) => {
  const { set, error } = await ensureOwnership(setId, userId);

  if (error || !set) {
    const statusCode = error?.statusCode ?? 404;
    const message = error?.message ?? 'Set not found';
    throw new Error(`${statusCode}: ${message}`);
  }

  await prisma.$transaction(async (tx) => {
    const cards = await tx.flashcards.findMany({
      where: { set_id: setId },
      select: { id: true }
    });

    const cardIds = cards.map((card) => card.id);

    if (cardIds.length > 0) {
      await tx.spaced_repetition_cards.deleteMany({
        where: {
          flashcard_id: {
            in: cardIds
          }
        }
      });

      await tx.flashcard_review_logs.deleteMany({
        where: {
          flashcard_id: {
            in: cardIds
          }
        }
      });
    }

    await tx.user_saved_sets.deleteMany({
      where: { set_id: setId }
    });

    // Keep imported clones, but remove their link to the deleted source set.
    await tx.flashcard_sets.updateMany({
      where: { imported_from_set_id: setId },
      data: { imported_from_set_id: null }
    });

    await tx.flashcards.deleteMany({
      where: { set_id: setId }
    });

    await tx.flashcard_sets.delete({
      where: { id: setId }
    });
  });
};
