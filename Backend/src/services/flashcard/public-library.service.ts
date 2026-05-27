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

// Lấy danh sách các bộ flashcard công khai để hiển thị ở màn hình khám phá.
export const getPublicFlashcardSets = async (page: number, limit: number, search: string, currentUserId?: number) => {
  const skip = (page - 1) * limit;
  const whereClause: any = {
    visibility: 'PUBLIC',
    deleted_at: null
  };

  if (currentUserId) {
    // Tách điều kiện cho bộ của admin và bộ của user để lọc chính xác hơn.
    whereClause.OR = [
      { 
        owner_user_id: null, 
        status: 'PUBLISHED' // Bộ của admin phải PUBLISHED mới được hiển thị.
      },
      { 
        user: { id: { not: currentUserId } }, 
        visibility: 'PUBLIC' 
      }
    ];
    // Bỏ filter visibility ở cấp cao nhất vì đã xử lý bên trong OR cho chính xác hơn.
    delete whereClause.visibility;
  } else {
    // Nếu không có userId thì hiển thị toàn bộ bộ public/published.
    whereClause.OR = [
      { owner_user_id: null, status: 'PUBLISHED' },
      { owner_user_id: { not: null }, visibility: 'PUBLIC' }
    ];
    delete whereClause.visibility;
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
        admin: { select: { id: true, full_name: true } },
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
    authorName: set.user?.full_name || set.admin?.full_name || 'admin',
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

// Lấy chi tiết một bộ flashcard công khai, kèm danh sách flashcard bên trong.
export const getPublicFlashcardSetDetail = async (setId: number) => {
  const set = await prisma.flashcard_sets.findFirst({
    where: { 
      id: setId,
      OR: [
        { visibility: 'PUBLIC' },
        { owner_user_id: null, status: 'PUBLISHED' }
      ],
      deleted_at: null
    },
    select: {
      id: true,
      title: true,
      description: true,
      card_count: true,
      user: { select: { id: true, full_name: true } },
      admin: { select: { id: true, full_name: true } },
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
    authorName: set.user?.full_name || set.admin?.full_name || 'admin',
    authorId: set.user?.id || set.admin?.id || null,
    savedCount: set.saved_by.length
  };

  return {
    set: setData,
    cards: set.flashcards
  };
};

// Sao chép một bộ public thành bộ mới thuộc sở hữu của user hiện tại.
export const importFlashcardSet = async (sourceSetId: number, userId: number) => {
  // Lấy bộ nguồn.
  const sourceSet = await prisma.flashcard_sets.findUnique({
    where: { id: sourceSetId },
    include: { flashcards: true }
  });

  if (!sourceSet) {
    throw new Error('404: Source set not found');
  }

  // Tạo bộ mới cho user.
  const newSet = await prisma.flashcard_sets.create({
    data: {
      user: { connect: { id: userId } },
      title: sourceSet.title,
      description: sourceSet.description,
      cover_image_url: sourceSet.cover_image_url,
      card_count: sourceSet.flashcards.length
    }
  });

  // Sao chép toàn bộ flashcard.
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
    update: {},  // Nếu đã lưu rồi thì không làm gì thêm.
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
