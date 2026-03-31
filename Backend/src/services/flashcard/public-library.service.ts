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

export const getPublicFlashcardSets = async (page: number, limit: number, search: string, currentUserId?: number) => {
  const skip = (page - 1) * limit;
  const whereClause: any = {
    visibility: 'PUBLIC',
    deleted_at: null
  };

  if (currentUserId) {
    whereClause.user = { id: { not: currentUserId } };
  }

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
  const set = await prisma.flashcard_sets.findFirst({
    where: { 
      id: setId,
      visibility: 'PUBLIC',
      deleted_at: null
    },
    select: {
      id: true,
      title: true,
      description: true,
      card_count: true,
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

  // Create new set for user
  const newSet = await prisma.flashcard_sets.create({
    data: {
      user: { connect: { id: userId } },
      title: sourceSet.title,
      description: sourceSet.description,
      cover_image_url: sourceSet.cover_image_url,
      card_count: sourceSet.flashcards.length
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
