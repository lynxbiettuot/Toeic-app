/**
 * Public Library Service
 * Business logic for public flashcard library operations
 */

import { prisma } from '../../lib/prisma.js';

export interface PublicSetData {
  id: number;
  title: string;
  description: string | null;
  cardCount: number;
  authorName: string;
  authorId: number | null;
  savedCount: number;
}

export const getPublicFlashcardSets = async (page: number, limit: number, search: string) => {
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {
    visibility: 'PUBLIC',
    status: 'PUBLISHED',
    warned_at: null,
    deleted_at: null
  };

  if (search) {
    whereClause.title = { contains: search };
  }

  const [sets, total] = await Promise.all([
    prisma.flashcard_sets.findMany({
      where: whereClause,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        card_count: true,
        user: { select: { id: true, full_name: true } },
        saved_by: { select: { id: true } }
      },
      orderBy: { created_at: 'desc' }
    }),
    prisma.flashcard_sets.count({ where: whereClause })
  ]);

  const data: PublicSetData[] = sets.map((set) => ({
    id: set.id,
    title: set.title,
    description: set.description,
    cardCount: set.card_count,
    authorName: set.user?.full_name || 'Unknown',
    authorId: set.user?.id || null,
    savedCount: set.saved_by.length
  }));

  return {
    sets: data,
    pagination: {
      page,
      limit,
      total,
      hasMore: skip + limit < total
    }
  };
};

export const getPublicFlashcardSetDetail = async (setId: number) => {
  const set = await prisma.flashcard_sets.findUnique({
    where: { id: setId },
    select: {
      id: true,
      title: true,
      description: true,
      card_count: true,
      visibility: true,
      status: true,
      warned_at: true,
      deleted_at: true,
      user: { select: { id: true, full_name: true } },
      flashcards: {
        select: {
          id: true,
          word: true,
          pronunciation: true,
          definition: true,
          example: true,
          image_url: true
        }
      },
      saved_by: { select: { id: true } }
    }
  });

  if (!set) {
    throw new Error('404: Set not found');
  }

  if (set.visibility !== 'PUBLIC' || set.status !== 'PUBLISHED' || set.warned_at !== null || set.deleted_at !== null) {
    throw new Error('403: Set is not public');
  }

  const setData: PublicSetData = {
    id: set.id,
    title: set.title,
    description: set.description,
    cardCount: set.card_count,
    authorName: set.user?.full_name || 'Unknown',
    authorId: set.user?.id || null,
    savedCount: set.saved_by.length
  };

  return {
    set: setData,
    cards: set.flashcards
  };
};

export const importFlashcardSet = async (sourceSetId: number, userId: number) => {
  // Get source set
  const sourceSet = await prisma.flashcard_sets.findUnique({
    where: { id: sourceSetId },
    include: { flashcards: true }
  });

  if (!sourceSet) {
    throw new Error('404: Source set not found');
  }

  if (
    sourceSet.visibility !== 'PUBLIC' ||
    sourceSet.status !== 'PUBLISHED' ||
    sourceSet.warned_at !== null ||
    sourceSet.deleted_at !== null
  ) {
    throw new Error('403: Only PUBLIC sets can be imported');
  }

  // Create new set for user
  const newSet = await prisma.flashcard_sets.create({
    data: {
      owner_user_id: userId,
      title: sourceSet.title,
      description: sourceSet.description,
      cover_image_url: sourceSet.cover_image_url,
      visibility: 'PRIVATE',
      card_count: sourceSet.flashcards.length,
      imported_from_set_id: sourceSetId,
      original_owner_id: sourceSet.owner_user_id
    }
  });

  // Copy all flashcards
  if (sourceSet.flashcards.length > 0) {
    await prisma.flashcards.createMany({
      data: sourceSet.flashcards.map((card) => ({
        set_id: newSet.id,
        word: card.word,
        word_type: card.word_type,
        pronunciation: card.pronunciation,
        definition: card.definition,
        example: card.example,
        image_url: card.image_url,
        audio_url: card.audio_url
      }))
    });
  }

  // Mark source set as saved by this user (increase saved count)
  await prisma.user_saved_sets.upsert({
    where: {
      user_id_set_id: {
        user_id: userId,
        set_id: sourceSetId
      }
    },
    update: {},  // If already saved, do nothing
    create: {
      user_id: userId,
      set_id: sourceSetId
    }
  });

  return {
    setId: newSet.id,
    message: `Đã thêm Bộ từ vựng "${sourceSet.title}" vào kho từ vựng của bạn!`
  };
};
