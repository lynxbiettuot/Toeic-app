import { prisma } from '../../lib/prisma.js';
import { buildNextSchedule, countDueCards } from '../../utils/flashcard/index.js';
import type { ReviewRating } from '../../utils/flashcard/normalizers.js';

export interface ReviewCard {
  id: number;
  setId: number;
  setTitle: string;
  word: string;
  word_type: string | null;
  pronunciation: string | null;
  definition: string;
  example: string | null;
  image_url: string | null;
  reviewState: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewAt: string | null;
  };
}

export const getDueReviewCards = async (userId: number) => {
  const now = new Date();

  const dbCards = await prisma.flashcards.findMany({
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

  const formattedCards: ReviewCard[] = dbCards.map((card) => {
    const state = card.spaced[0] ?? null;

    return {
      id: card.id,
      setId: card.set_id,
      setTitle: card.set.title,
      word: card.word,
      word_type: card.word_type,
      pronunciation: card.pronunciation,
      definition: card.definition,
      example: card.example,
      image_url: card.image_url,
      reviewState: {
        easeFactor: state?.ease_factor ?? 2.5,
        intervalDays: state?.interval_days ?? 1,
        repetitions: state?.repetitions ?? 0,
        nextReviewAt: state?.next_review_at?.toISOString() ?? null
      }
    };
  });

  const dueCount = formattedCards.length;

  return { cards: formattedCards, dueCount, now };
};

export const rateReviewCard = async (cardId: number, userId: number, rating: ReviewRating) => {
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
    throw new Error('404: Flashcard not found');
  }

  if (currentCard.set.owner_user_id !== userId) {
    throw new Error('403: Unauthorized');
  }

  const reviewState = currentCard.spaced[0];
  const nextSchedule = buildNextSchedule(
    rating,
    reviewState?.ease_factor ?? 2.5,
    reviewState?.interval_days ?? 1,
    reviewState?.repetitions ?? 0
  );

  // Update or create spaced repetition state
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

  // Log the review
  await prisma.flashcard_review_logs.create({
    data: {
      user_id: userId,
      flashcard_id: cardId,
      rating,
      reviewed_at: nextSchedule.now
    }
  });

  // Count remaining due cards
  const dueCount = await countDueCards(userId, nextSchedule.now);

  return {
    nextReviewAt: nextSchedule.nextReviewAt,
    intervalDays: nextSchedule.intervalDays,
    repetitions: nextSchedule.repetitions,
    dueCount
  };
};

export const getTodayReviewStats = async (userId: number) => {
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

  return { reviewedCount, startOfDay, endOfDay };
};

export const getPracticeCards = async (userId: number, limit: number) => {
  const randomCards = await prisma.$queryRaw`
    SELECT c.*, s.title as set_title
    FROM flashcards c
    INNER JOIN flashcard_sets s ON c.set_id = s.id
    WHERE s.owner_user_id = ${userId}
    ORDER BY RAND()
    LIMIT ${limit}
  `;

  return (randomCards as any[]).map(card => ({
    id: card.id,
    setId: card.set_id,
    setTitle: card.set_title,
    word: card.word,
    word_type: card.word_type,
    pronunciation: card.pronunciation,
    definition: card.definition,
    example: card.example,
    image_url: card.image_url,
    reviewState: {
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      nextReviewAt: null
    }
  }));
};
