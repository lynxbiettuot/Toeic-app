/**
 * Flashcard Set Service
 * Business logic for CRUD operations on flashcard sets
 */

import { prisma } from '../../lib/prisma.js';
import { ensureOwnership, updateCardCount } from '../../utils/flashcard/index.js';

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
  const { error } = await ensureOwnership(setId, userId);

  if (error) {
    throw new Error(`${error.statusCode}: ${error.message}`);
  }

  // Delete all cards in set
  await prisma.flashcards.deleteMany({
    where: { set_id: setId }
  });

  // Delete the set
  await prisma.flashcard_sets.delete({
    where: { id: setId }
  });
};
