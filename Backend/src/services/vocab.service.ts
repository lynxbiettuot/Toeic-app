import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import { isHttpUrl } from "../utils/media.utils.js";

const VALID_SET_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;
const FLASHCARD_IMAGE_URL_MAX_LENGTH = 191;

const sanitizeImageUrlForDb = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  // Try to shorten long tracking URLs first by dropping query/hash.
  try {
    const url = new URL(normalized);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return normalized;
  }
};

const normalizeExcelCellText = (row: ExcelJS.Row, columnIndex: number): string => {
  const cell = row.getCell(columnIndex);
  const raw = cell.value as any;

  if (raw === null || raw === undefined) {
    return "";
  }

  if (typeof raw === "string") {
    return raw.trim();
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw).trim();
  }

  if (raw instanceof Date) {
    return raw.toISOString();
  }

  if (typeof raw === "object") {
    // Hyperlink value: { text, hyperlink }
    if (typeof raw.text === "string") {
      return raw.text.trim();
    }
    // Some sheets store only hyperlink in object form
    if (typeof raw.hyperlink === "string") {
      return raw.hyperlink.trim();
    }
    // Rich text value: { richText: [{ text: "..." }] }
    if (Array.isArray(raw.richText)) {
      const merged = raw.richText.map((item: any) => item?.text ?? "").join("");
      return String(merged).trim();
    }
  }

  return String(cell.text ?? "").trim();
};

export class VocabService {
  /**
   * Lấy danh sách các bộ từ vựng (Hệ thống hoặc User Public)
   */
  static async getVocabSets(filters: { search?: string; status?: string; includeDeleted?: boolean }) {
    const { search, status, includeDeleted } = filters;

    const where: any = {};

    if (status === "DELETED") {
      where.deleted_at = { not: null };
    } else if (!includeDeleted) {
      where.deleted_at = null;
    }

    if (status && VALID_SET_STATUSES.includes(status as any)) {
      where.status = status;
    }

    if (search) {
      where.title = { contains: search };
    }

    return prisma.flashcard_sets.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        user: { select: { full_name: true } },
        admin: { select: { full_name: true } },
      },
    });
  }

  /**
   * Lấy chi tiết bộ từ vựng kèm danh sách thẻ
   */
  static async getVocabSetDetail(setId: number) {
    const set = await prisma.flashcard_sets.findUnique({
      where: { id: setId },
      include: {
        flashcards: {
          orderBy: { word: "asc" },
        },
      },
    });

    if (!set) throw new Error("Không tìm thấy bộ từ vựng.");
    return set;
  }

  /**
   * Tạo bộ từ vựng thủ công
   */
  static async createVocabSet(data: { title: string; description?: string; cards: any[]; adminId?: number }) {
    if (!data.title) throw new Error("Tiêu đề bộ từ vựng là bắt buộc.");

    const invalidCreateCard = data.cards.find(
      (card) => card?.image_url && String(card.image_url).trim() && !isHttpUrl(String(card.image_url))
    );

    if (invalidCreateCard) {
      throw new Error(
        `URL ảnh không hợp lệ cho từ ${invalidCreateCard.word || "(không có từ)"}. Chỉ chấp nhận HTTP/HTTPS.`
      );
    }

    return prisma.$transaction(async (tx) => {
      const set = await tx.flashcard_sets.create({
        data: {
          title: data.title,
          description: data.description,
          status: "DRAFT",
          visibility: "PRIVATE",
          is_system: true,
          owner_admin_id: data.adminId,
          card_count: data.cards.length,
        },
      });

      if (data.cards.length > 0) {
        await tx.flashcards.createMany({
          data: data.cards.map(c => ({
            set_id: set.id,
            word: c.word,
            definition: c.definition,
            word_type: c.word_type,
            pronunciation: c.pronunciation,
            example: c.example,
            image_url: c.image_url?.trim() || null,
          })),
        });
      }

      return set;
    });
  }

  /**
   * Import từ vựng từ Excel/CSV
   */
  static async importVocabFromExcel(buffer: Buffer, metadata: { title: string; description?: string; adminId?: number }) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0] ?? workbook.getWorksheet(1);
    if (!worksheet) throw new Error("File Excel không hợp lệ.");

    const cards: any[] = [];
    // Phép bóc tách đơn giản (Word, Definition, Type, Pronunciation, Example, ImageURL)
    worksheet.eachRow((row, rowNum) => {
      if (rowNum > 1) { // Bỏ qua header
        const word = normalizeExcelCellText(row, 1);
        const def = normalizeExcelCellText(row, 2);
        if (word && def) {
          const rawImageUrl = normalizeExcelCellText(row, 6);
          const imageUrl = rawImageUrl ? sanitizeImageUrlForDb(rawImageUrl) : null;

          if (imageUrl && !isHttpUrl(imageUrl)) {
            throw new Error(`Dòng ${rowNum}: URL ảnh không hợp lệ (chỉ chấp nhận HTTP/HTTPS).`);
          }

          if (imageUrl && imageUrl.length > FLASHCARD_IMAGE_URL_MAX_LENGTH) {
            throw new Error(
              `Dòng ${rowNum}: URL ảnh quá dài (${imageUrl.length} ký tự). Tối đa ${FLASHCARD_IMAGE_URL_MAX_LENGTH} ký tự.`
            );
          }

          cards.push({
            word,
            definition: def,
            word_type: normalizeExcelCellText(row, 3) || null,
            pronunciation: normalizeExcelCellText(row, 4) || null,
            example: normalizeExcelCellText(row, 5) || null,
            image_url: imageUrl,
          });
        }
      }
    });

    if (cards.length === 0) throw new Error("File Excel không chứa dữ liệu từ vựng hợp lệ.");

    return this.createVocabSet({ ...metadata, cards });
  }

  static async updateVocabSet(setId: number, data: { title?: string; description?: string; cards?: any[]; cover_image_url?: string }) {
    const { title, description, cards, cover_image_url } = data;

    return prisma.$transaction(async (tx) => {
      // 1. Cập nhật thông tin cơ bản của bộ
      const set = await tx.flashcard_sets.update({
        where: { id: setId },
        data: {
          title: title?.trim(),
          description: description?.trim(),
          cover_image_url,
          updated_at: new Date(),
        },
      });

      // 2. Đồng bộ danh sách thẻ (nếu có tham số cards)
      if (cards && Array.isArray(cards)) {
        const invalidUpdateCard = cards.find(
          (card) => card?.image_url && String(card.image_url).trim() && !isHttpUrl(String(card.image_url))
        );

        if (invalidUpdateCard) {
          throw new Error(
            `URL ảnh không hợp lệ cho từ ${invalidUpdateCard.word || "(không có từ)"}. Chỉ chấp nhận HTTP/HTTPS.`
          );
        }

        // Lấy danh sách ID thẻ hiện có trong DB của bộ này
        const existingCards = await tx.flashcards.findMany({
          where: { set_id: setId },
          select: { id: true }
        });
        const existingIds = existingCards.map(c => c.id);

        // Lấy danh sách ID số từ Frontend gửi lên (những thẻ cũ đang sửa)
        const incomingIds = cards
          .map(c => Number(c.id))
          .filter(id => !isNaN(id));

        // Xác định các thẻ cần xóa (có trong DB nhưng không có trong danh sách mới)
        const cardsToDelete = existingIds.filter(id => !incomingIds.includes(id));

        if (cardsToDelete.length > 0) {
          // Xóa các bảng liên quan trước do ràng buộc FK
          await tx.spaced_repetition_cards.deleteMany({
            where: { flashcard_id: { in: cardsToDelete } }
          });
          await tx.flashcard_review_logs.deleteMany({
            where: { flashcard_id: { in: cardsToDelete } }
          });
          await tx.flashcards.deleteMany({
            where: { id: { in: cardsToDelete } }
          });
        }

        // Cập nhật hoặc tạo mới từng thẻ
        for (const c of cards) {
          const normalizedImageUrl = c.image_url?.trim() || null;
          if (normalizedImageUrl && !isHttpUrl(normalizedImageUrl)) {
            throw new Error(
              `URL ảnh không hợp lệ cho từ ${c.word || "(không có từ)"}. Chỉ chấp nhận HTTP/HTTPS.`
            );
          }

          const cardData = {
            word: c.word?.trim() || "",
            definition: c.definition?.trim() || "",
            word_type: c.word_type?.trim() || null,
            pronunciation: c.pronunciation?.trim() || null,
            example: c.example?.trim() || null,
            image_url: normalizedImageUrl,
            updated_at: new Date(),
          };

          const isNew = typeof c.id === 'string' && c.id.startsWith('new-');
          if (isNew) {
            await tx.flashcards.create({
              data: {
                ...cardData,
                set_id: setId,
              }
            });
          } else {
            const numericId = Number(c.id);
            if (!isNaN(numericId)) {
              await tx.flashcards.update({
                where: { id: numericId },
                data: cardData
              });
            }
          }
        }

        // 3. Cập nhật lại số lượng thẻ thực tế
        await tx.flashcard_sets.update({
          where: { id: setId },
          data: { card_count: cards.length }
        });
      }

      return set;
    });
  }

  /**
   * Cập nhật trạng thái bộ từ vựng
   */
  static async updateStatus(setId: number, status: string) {
    const targetSet = await prisma.flashcard_sets.findUnique({
      where: { id: setId },
      select: { id: true, owner_user_id: true },
    });

    if (!targetSet) throw new Error("Không tìm thấy bộ từ vựng.");

    const updateData: any = { status };
    updateData.visibility = status === "PUBLISHED" ? "PUBLIC" : "PRIVATE";

    return prisma.flashcard_sets.update({
      where: { id: setId },
      data: updateData,
    });
  }

  /**
   * Xóa mềm bộ từ vựng
   */
  static async softDelete(setId: number) {
    return prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        status: "DELETED",
        deleted_at: new Date(),
      },
    });
  }

  /**
   * Khôi phục bộ từ vựng đã xóa mềm
   */
  static async restore(setId: number) {
    return prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        status: "HIDDEN",
        deleted_at: null,
      },
    });
  }

  /**
   * Cảnh báo User (Ẩn bộ từ vựng của User)
   */
  static async warnUserSet(setId: number) {
    const set = await prisma.flashcard_sets.findFirst({
      where: { id: setId, owner_user_id: { not: null }, visibility: "PUBLIC" },
    });

    if (!set) throw new Error("Không tìm thấy bộ từ vựng công khai của User.");

    return prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        visibility: "PRIVATE",
        status: "HIDDEN",
      },
    });
  }
}
