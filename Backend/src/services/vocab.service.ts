import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import { isHttpUrl } from "../utils/media.utils.js";

const VALID_SET_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;

export class VocabService {
  /**
   * Lấy danh sách các bộ từ vựng (Hệ thống hoặc User Public)
   */
  static async getVocabSets(filters: { search?: string; status?: string; includeDeleted?: boolean }) {
    const { search, status, includeDeleted } = filters;

    const where: any = {
      OR: [
        { is_system: true },
        { visibility: "PUBLIC" },
      ],
    };

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
            image_url: c.image_url,
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
        const word = row.getCell(1).text?.trim();
        const def = row.getCell(2).text?.trim();
        if (word && def) {
          cards.push({
            word,
            definition: def,
            word_type: row.getCell(3).text?.trim() || null,
            pronunciation: row.getCell(4).text?.trim() || null,
            example: row.getCell(5).text?.trim() || null,
            image_url: row.getCell(6).text?.trim() || null,
          });
        }
      }
    });

    if (cards.length === 0) throw new Error("File Excel không chứa dữ liệu từ vựng hợp lệ.");

    return this.createVocabSet({ ...metadata, cards });
  }

  /**
   * Cập nhật thông tin bộ từ vựng
   */
  static async updateVocabSet(setId: number, data: { title?: string; description?: string; cover_image_url?: string }) {
    return prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        title: data.title?.trim(),
        description: data.description?.trim(),
        cover_image_url: data.cover_image_url,
      },
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
    if (targetSet.owner_user_id) {
      updateData.visibility = status === "PUBLISHED" ? "PUBLIC" : "PRIVATE";
    }

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
