import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const parseUserId = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseSetId = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const normalizeVisibility = (value: unknown) => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : 'PRIVATE';
  return raw === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
};

type ReviewRating = 'FORGOT' | 'HARD' | 'GOOD' | 'EASY';

const normalizeRating = (value: unknown): ReviewRating | null => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (raw === 'FORGOT' || raw === 'HARD' || raw === 'GOOD' || raw === 'EASY') {
    return raw;
  }
  return null;
};

const buildNextSchedule = (
  rating: ReviewRating,
  previousEaseFactor: number,
  previousIntervalDays: number,
  previousRepetitions: number
) => {
  const safeEaseFactor = Number.isFinite(previousEaseFactor) ? previousEaseFactor : 2.5;
  const safeIntervalDays = previousIntervalDays > 0 ? previousIntervalDays : 1;
  const safeRepetitions = previousRepetitions >= 0 ? previousRepetitions : 0;

  let easeFactor = safeEaseFactor;
  let intervalDays = safeIntervalDays;
  let repetitions = safeRepetitions;

  if (rating === 'FORGOT') {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, safeEaseFactor - 0.2);
  }

  if (rating === 'HARD') {
    repetitions = safeRepetitions + 1;
    intervalDays = safeRepetitions <= 1 ? 1 : Math.ceil(safeIntervalDays * 1.2);
    easeFactor = Math.max(1.3, safeEaseFactor - 0.15);
  }

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

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt,
    now
  };
};

const countDueCards = async (userId: number, now: Date) => {
  return prisma.flashcards.count({
    where: {
      set: {
        owner_user_id: userId,
        deleted_at: null
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

const updateCardCount = async (setId: number) => {
  const cardCount = await prisma.flashcards.count({ where: { set_id: setId } });
  await prisma.flashcard_sets.update({
    where: { id: setId },
    data: { card_count: cardCount }
  });
};

const ensureOwnership = async (setId: number, userId: number) => {
  const set = await prisma.flashcard_sets.findUnique({ where: { id: setId } });

  if (!set) {
    return { set: null, error: { statusCode: 404, message: 'Không tìm thấy bộ từ vựng.' } };
  }

  if (set.owner_user_id !== userId) {
    return {
      set: null,
      error: { statusCode: 403, message: 'Bạn không có quyền thao tác với bộ từ vựng này.' }
    };
  }

  return { set, error: null };
};

export const getUserFlashcardSets = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu userId hợp lệ.', statusCode: 400 });
    }

    const sets = await prisma.flashcard_sets.findMany({
      where: {
        owner_user_id: userId,
        deleted_at: null
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json({ statusCode: 200, data: sets });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const createFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.body.userId);
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : null;
    const visibility = normalizeVisibility(req.body.visibility);

    if (!userId || !title) {
      return res.status(400).json({ message: 'Thiếu dữ liệu tạo bộ từ vựng.', statusCode: 400 });
    }

    const createdSet = await prisma.flashcard_sets.create({
      data: {
        owner_user_id: userId,
        title,
        description,
        visibility
      }
    });

    return res.status(201).json({ statusCode: 201, message: 'Tạo bộ từ vựng thành công.', data: createdSet });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const updateFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.body.userId);
    const setId = parseSetId(req.params.setId);
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : null;
    const visibility = normalizeVisibility(req.body.visibility);

    if (!userId || !setId || !title) {
      return res.status(400).json({ message: 'Thiếu dữ liệu cập nhật bộ từ vựng.', statusCode: 400 });
    }

    const { error } = await ensureOwnership(setId, userId);

    if (error) {
      return res.status(error.statusCode).json(error);
    }

    const updatedSet = await prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        title,
        description,
        visibility,
        updated_at: new Date()
      }
    });

    return res.json({ statusCode: 200, message: 'Cập nhật bộ từ vựng thành công.', data: updatedSet });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const deleteFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.query.userId);
    const setId = parseSetId(req.params.setId);

    if (!userId || !setId) {
      return res.status(400).json({ message: 'Thiếu dữ liệu xóa bộ từ vựng.', statusCode: 400 });
    }

    const { error } = await ensureOwnership(setId, userId);

    if (error) {
      return res.status(error.statusCode).json(error);
    }

    await prisma.flashcards.deleteMany({ where: { set_id: setId } });
    await prisma.flashcard_sets.delete({ where: { id: setId } });

    return res.json({ statusCode: 200, message: 'Xóa bộ từ vựng thành công.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const getFlashcardsBySet = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.query.userId);
    const setId = parseSetId(req.params.setId);

    if (!userId || !setId) {
      return res.status(400).json({ message: 'Thiếu dữ liệu lấy flashcard.', statusCode: 400 });
    }

    const { set, error } = await ensureOwnership(setId, userId);

    if (error || !set) {
      return res.status(error?.statusCode ?? 404).json(error ?? { message: 'Không tìm thấy bộ từ vựng.', statusCode: 404 });
    }

    const cards = await prisma.flashcards.findMany({
      where: { set_id: setId },
      orderBy: { created_at: 'desc' }
    });

    return res.json({ statusCode: 200, data: { set, cards } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const createFlashcard = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.body.userId);
    const setId = parseSetId(req.params.setId);
    const word = typeof req.body.word === 'string' ? req.body.word.trim() : '';
    const definition = typeof req.body.definition === 'string' ? req.body.definition.trim() : '';
    const wordType = typeof req.body.wordType === 'string' ? req.body.wordType.trim() : null;
    const pronunciation = typeof req.body.pronunciation === 'string' ? req.body.pronunciation.trim() : null;
    const example = typeof req.body.example === 'string' ? req.body.example.trim() : null;

    if (!userId || !setId || !word || !definition) {
      return res.status(400).json({ message: 'Thiếu dữ liệu tạo flashcard.', statusCode: 400 });
    }

    const { error } = await ensureOwnership(setId, userId);

    if (error) {
      return res.status(error.statusCode).json(error);
    }

    const createdCard = await prisma.flashcards.create({
      data: {
        set_id: setId,
        word,
        definition,
        word_type: wordType,
        pronunciation,
        example
      }
    });

    await updateCardCount(setId);

    return res.status(201).json({ statusCode: 201, message: 'Tạo flashcard thành công.', data: createdCard });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const updateFlashcard = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.body.userId);
    const cardId = parseSetId(req.params.cardId);
    const word = typeof req.body.word === 'string' ? req.body.word.trim() : '';
    const definition = typeof req.body.definition === 'string' ? req.body.definition.trim() : '';
    const wordType = typeof req.body.wordType === 'string' ? req.body.wordType.trim() : null;
    const pronunciation = typeof req.body.pronunciation === 'string' ? req.body.pronunciation.trim() : null;
    const example = typeof req.body.example === 'string' ? req.body.example.trim() : null;

    if (!userId || !cardId || !word || !definition) {
      return res.status(400).json({ message: 'Thiếu dữ liệu cập nhật flashcard.', statusCode: 400 });
    }

    const currentCard = await prisma.flashcards.findUnique({ where: { id: cardId } });

    if (!currentCard) {
      return res.status(404).json({ message: 'Không tìm thấy flashcard.', statusCode: 404 });
    }

    const { error } = await ensureOwnership(currentCard.set_id, userId);

    if (error) {
      return res.status(error.statusCode).json(error);
    }

    const updatedCard = await prisma.flashcards.update({
      where: { id: cardId },
      data: {
        word,
        definition,
        word_type: wordType,
        pronunciation,
        example,
        updated_at: new Date()
      }
    });

    return res.json({ statusCode: 200, message: 'Cập nhật flashcard thành công.', data: updatedCard });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const deleteFlashcard = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.query.userId);
    const cardId = parseSetId(req.params.cardId);

    if (!userId || !cardId) {
      return res.status(400).json({ message: 'Thiếu dữ liệu xóa flashcard.', statusCode: 400 });
    }

    const currentCard = await prisma.flashcards.findUnique({ where: { id: cardId } });

    if (!currentCard) {
      return res.status(404).json({ message: 'Không tìm thấy flashcard.', statusCode: 404 });
    }

    const { error } = await ensureOwnership(currentCard.set_id, userId);

    if (error) {
      return res.status(error.statusCode).json(error);
    }

    await prisma.flashcards.delete({ where: { id: cardId } });
    await updateCardCount(currentCard.set_id);

    return res.json({ statusCode: 200, message: 'Xóa flashcard thành công.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const getDueReviewCards = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu userId hợp lệ.', statusCode: 400 });
    }

    const now = new Date();
    const cards = await prisma.flashcards.findMany({
      where: {
        set: {
          owner_user_id: userId,
          deleted_at: null
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
      },
      include: {
        set: {
          select: {
            id: true,
            title: true
          }
        },
        spaced: {
          where: { user_id: userId },
          take: 1
        }
      },
      orderBy: [{ created_at: 'asc' }]
    });

    const formattedCards = cards.map((card) => {
      const state = card.spaced[0] ?? null;

      return {
        id: card.id,
        setId: card.set_id,
        setTitle: card.set.title,
        word: card.word,
        pronunciation: card.pronunciation,
        definition: card.definition,
        example: card.example,
        reviewState: {
          easeFactor: state?.ease_factor ?? 2.5,
          intervalDays: state?.interval_days ?? 1,
          repetitions: state?.repetitions ?? 0,
          nextReviewAt: state?.next_review_at ?? null
        }
      };
    });

    return res.json({
      statusCode: 200,
      data: {
        cards: formattedCards,
        dueCount: formattedCards.length,
        now
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const rateReviewCard = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.body.userId);
    const cardId = parseSetId(req.params.cardId);
    const rating = normalizeRating(req.body.rating);

    if (!userId || !cardId || !rating) {
      return res.status(400).json({ message: 'Thiếu dữ liệu đánh giá ôn tập.', statusCode: 400 });
    }

    const currentCard = await prisma.flashcards.findUnique({
      where: { id: cardId },
      include: {
        set: true,
        spaced: {
          where: { user_id: userId },
          take: 1
        }
      }
    });

    if (!currentCard) {
      return res.status(404).json({ message: 'Không tìm thấy flashcard.', statusCode: 404 });
    }

    if (currentCard.set.owner_user_id !== userId) {
      return res.status(403).json({
        message: 'Bạn không có quyền ôn tập flashcard này.',
        statusCode: 403
      });
    }

    const reviewState = currentCard.spaced[0];
    const nextSchedule = buildNextSchedule(
      rating,
      reviewState?.ease_factor ?? 2.5,
      reviewState?.interval_days ?? 1,
      reviewState?.repetitions ?? 0
    );

    if (reviewState) {
      await prisma.spaced_repetition_cards.update({
        where: {
          user_id_flashcard_id: {
            user_id: userId,
            flashcard_id: cardId
          }
        },
        data: {
          ease_factor: nextSchedule.easeFactor,
          interval_days: nextSchedule.intervalDays,
          repetitions: nextSchedule.repetitions,
          next_review_at: nextSchedule.nextReviewAt,
          last_reviewed_at: nextSchedule.now,
          last_rating: rating
        }
      });
    } else {
      await prisma.spaced_repetition_cards.create({
        data: {
          user_id: userId,
          flashcard_id: cardId,
          ease_factor: nextSchedule.easeFactor,
          interval_days: nextSchedule.intervalDays,
          repetitions: nextSchedule.repetitions,
          next_review_at: nextSchedule.nextReviewAt,
          last_reviewed_at: nextSchedule.now,
          last_rating: rating
        }
      });
    }

    await prisma.flashcard_review_logs.create({
      data: {
        user_id: userId,
        flashcard_id: cardId,
        rating,
        reviewed_at: nextSchedule.now
      }
    });

    const dueCount = await countDueCards(userId, nextSchedule.now);

    return res.json({
      statusCode: 200,
      message: 'Đã lưu kết quả ôn tập.',
      data: {
        nextReviewAt: nextSchedule.nextReviewAt,
        intervalDays: nextSchedule.intervalDays,
        repetitions: nextSchedule.repetitions,
        dueCount
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const getPublicFlashcardSets = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);
    const search = (req.query.search as string || '').trim().toLowerCase();
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      visibility: 'PUBLIC',
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

    const data = sets.map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      cardCount: set.card_count,
      authorName: set.user?.full_name || 'Unknown',
      authorId: set.user?.id || null,
      savedCount: set.saved_by.length
    }));

    return res.json({
      statusCode: 200,
      data: {
        sets: data,
        pagination: { page, limit, total, hasMore: skip + limit < total }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const getPublicFlashcardSetDetail = async (req: Request, res: Response) => {
  try {
    const setId = parseSetId(req.params.setId);

    if (!setId) {
      return res.status(400).json({ message: 'Invalid setId', statusCode: 400 });
    }

    const set = await prisma.flashcard_sets.findUnique({
      where: { id: setId },
      select: {
        id: true,
        title: true,
        description: true,
        card_count: true,
        visibility: true,
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
      return res.status(404).json({ message: 'Set không tìm thấy', statusCode: 404 });
    }

    if (set.visibility !== 'PUBLIC') {
      return res.status(403).json({ message: 'Set không công khai', statusCode: 403 });
    }

    return res.json({
      statusCode: 200,
      data: {
        set: {
          id: set.id,
          title: set.title,
          description: set.description,
          cardCount: set.card_count,
          authorName: set.user?.full_name || 'Unknown',
          authorId: set.user?.id || null,
          savedCount: set.saved_by.length
        },
        cards: set.flashcards
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const importFlashcardSet = async (req: Request, res: Response) => {
  try {
    const sourceSetId = parseSetId(req.params.setId);
    const userId = parseUserId(req.query.userId);

    if (!sourceSetId || !userId) {
      return res.status(400).json({ message: 'Invalid setId or userId', statusCode: 400 });
    }

    // Get source set
    const sourceSet = await prisma.flashcard_sets.findUnique({
      where: { id: sourceSetId },
      include: { flashcards: true }
    });

    if (!sourceSet) {
      return res.status(404).json({ message: 'Source set không tìm thấy', statusCode: 404 });
    }

    if (sourceSet.visibility !== 'PUBLIC') {
      return res.status(403).json({ message: 'Chỉ có thể import bộ PUBLIC', statusCode: 403 });
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

    return res.status(201).json({
      statusCode: 201,
      data: {
        setId: newSet.id,
        message: `✅ Đã import "${sourceSet.title}" vào thư viện`
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const getTodayReviewStats = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu userId hợp lệ.', statusCode: 400 });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const reviewedCount = await prisma.flashcard_review_logs.count({
      where: {
        user_id: userId,
        reviewed_at: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    return res.json({
      statusCode: 200,
      data: {
        reviewedCount,
        startOfDay,
        endOfDay
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};