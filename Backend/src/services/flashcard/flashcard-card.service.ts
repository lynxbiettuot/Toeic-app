import { prisma } from '../../lib/prisma.js';
import { ensureOwnership, updateCardCount } from '../../utils/flashcard/index.js';

export const getFlashcardsBySet = async (setId: number, userId: number) => {
  const { set, error } = await ensureOwnership(setId, userId);

  if (error || !set) {
    throw new Error(`${error?.statusCode ?? 404}: ${error?.message ?? 'Set not found'}`);
  }

  const cards = await prisma.flashcards.findMany({
    where: { set_id: setId },
    orderBy: { created_at: 'desc' }
  });

  return { set, cards };
};

export const createFlashcard = async (
  setId: number,
  userId: number,
  word: string,
  definition: string,
  wordType: string | null,
  pronunciation: string | null,
  example: string | null,
  imageUrl: string | null
) => {
  const { error } = await ensureOwnership(setId, userId);

  if (error) {
    throw new Error(`${error.statusCode}: ${error.message}`);
  }

  const card = await prisma.flashcards.create({
    data: {
      set_id: setId,
      word,
      definition,
      word_type: wordType,
      pronunciation,
      example,
      image_url: imageUrl
    }
  });

  await updateCardCount(setId);

  return card;
};

export const updateFlashcard = async (
  cardId: number,
  userId: number,
  word: string,
  definition: string,
  wordType: string | null,
  pronunciation: string | null,
  example: string | null,
  imageUrl: string | null
) => {
  const currentCard = await prisma.flashcards.findUnique({
    where: { id: cardId }
  });

  if (!currentCard) {
    throw new Error('404: Flashcard not found');
  }

  const { error } = await ensureOwnership(currentCard.set_id, userId);

  if (error) {
    throw new Error(`${error.statusCode}: ${error.message}`);
  }

  return prisma.flashcards.update({
    where: { id: cardId },
    data: {
      word,
      definition,
      word_type: wordType,
      pronunciation,
      example,
      image_url: imageUrl,
      updated_at: new Date()
    }
  });
};

export const deleteFlashcard = async (cardId: number, userId: number) => {
  const currentCard = await prisma.flashcards.findUnique({
    where: { id: cardId }
  });

  if (!currentCard) {
    throw new Error('404: Flashcard not found');
  }

  const { error } = await ensureOwnership(currentCard.set_id, userId);

  if (error) {
    throw new Error(`${error.statusCode}: ${error.message}`);
  }

  await prisma.flashcards.delete({
    where: { id: cardId }
  });

  await updateCardCount(currentCard.set_id);
};
