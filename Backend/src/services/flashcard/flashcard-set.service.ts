import { prisma } from '../../lib/prisma.js';
import { ensureOwnership } from '../../utils/flashcard/index.js';

// Trả về toàn bộ bộ flashcard thuộc về một người dùng.
export const getUserFlashcardSets = async (userId: number) => {
  return prisma.flashcard_sets.findMany({
    where: {
      user: { id: userId }
    },
    orderBy: { created_at: 'desc' }
  });
};

// Tạo một bộ flashcard mới và gắn bộ đó với user đang đăng nhập.
export const createFlashcardSet = async (
  userId: number,
  title: string,
  description: string | null,
  visibility: 'PUBLIC' | 'PRIVATE'
) => {
  return prisma.flashcard_sets.create({
    data: {
      user: { connect: { id: userId } },
      title,
      description,
      visibility,
      status: 'DRAFT',
      is_system: false,
    }
  });
};

// Cập nhật thông tin bộ flashcard sau khi kiểm tra quyền sở hữu.
export const updateFlashcardSet = async (
  setId: number,
  userId: number,
  title: string,
  description: string | null,
  visibility: 'PUBLIC' | 'PRIVATE'
) => {
  const { set, error } = await ensureOwnership(setId, userId);

  if (error) {
    throw new Error(`${error.statusCode}: ${error.message}`);
  }

  // Tắt logic cảnh báo vì cột tương ứng chưa có trong CSDL.
  const effectiveVisibility = visibility;

  return prisma.flashcard_sets.update({
    where: { id: setId },
    data: {
      title,
      description,
      visibility: effectiveVisibility,
      updated_at: new Date()
    }
  });
};

// Xóa bộ flashcard và toàn bộ dữ liệu phụ thuộc như thẻ, trạng thái SRS, review logs.
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

    // Giữ lại logic clone đã import nếu sau này bổ sung cột imported_from_set_id.
    /*
    await tx.flashcard_sets.updateMany({
      where: { imported_from_set_id: setId },
      data: { imported_from_set_id: null }
    });
    */

    await tx.flashcards.deleteMany({
      where: { set_id: setId }
    });

    await tx.flashcard_sets.delete({
      where: { id: setId }
    });
  });
};
