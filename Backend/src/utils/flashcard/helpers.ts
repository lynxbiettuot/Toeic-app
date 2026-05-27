import { prisma } from '../../lib/prisma.js';

// Đếm số flashcard đến hạn ôn của một user tại một thời điểm cụ thể.
// @param userId - ID của user cần kiểm tra.
// @param now - Thời điểm hiện tại.
// @returns Số thẻ đến hạn.
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

// Cập nhật lại tổng số thẻ trong một bộ flashcard sau khi thêm/xóa card.
// @param setId - ID của bộ cần cập nhật.
export const updateCardCount = async (setId: number): Promise<void> => {
  const cardCount = await prisma.flashcards.count({
    where: { set_id: setId }
  });

  await prisma.flashcard_sets.update({
    where: { id: setId },
    data: { card_count: cardCount }
  });
};

// Kiểm tra quyền sở hữu bộ flashcard trước khi cho phép sửa/xóa.
// @param setId - ID của bộ cần kiểm tra quyền sở hữu.
// @param userId - ID của user cần xác minh.
// @returns Dữ liệu bộ và lỗi nếu kiểm tra quyền thất bại.
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
