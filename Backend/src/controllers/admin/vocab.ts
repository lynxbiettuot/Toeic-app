import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma.js";

const VALID_SET_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;

type ImportCard = {
  word: string;
  definition: string;
  word_type: string | null;
  pronunciation: string | null;
  example: string | null;
  image_url: string | null;
  audio_url: string | null;
};

const parseIntParam = (value: string | string[] | undefined): number => {
  const normalized = Array.isArray(value) ? value[0] : value;
  return Number.parseInt(normalized ?? "", 10);
};

const isHttpUrl = (value: string | null | undefined): boolean => {
  if (!value) {
    return true;
  }

  return /^https?:\/\//i.test(value.trim());
};

const parseCsvRows = (csvText: string): string[][] => {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
};

export const getSystemVocabSets = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const includeDeleted = req.query.includeDeleted === "true";

    const where: Record<string, unknown> = {
      OR: [
        {
          is_system: true,
        },
        {
          owner_user_id: {
            not: null,
          },
          visibility: "PUBLIC",
        },
        {
          owner_user_id: {
            not: null,
          },
          warned_at: {
            not: null,
          },
        },
      ],
    };

    if (status === "DELETED") {
      where.deleted_at = {
        not: null,
      };
    } else if (!includeDeleted) {
      where.deleted_at = null;
    }

    if (VALID_SET_STATUSES.includes(status as (typeof VALID_SET_STATUSES)[number])) {
      where.status = status;
    }

    if (search) {
      where.title = {
        contains: search,
      };
    }

    const sets = await prisma.flashcard_sets.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        cover_image_url: true,
        card_count: true,
        status: true,
        visibility: true,
        is_system: true,
        owner_user_id: true,
        owner_admin_id: true,
        warned_at: true,
        created_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
        admin: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    const normalizedSets = sets.map((set) => {
      const ownerType = set.owner_user_id ? "USER" : "ADMIN";
      const ownerName = set.user?.full_name ?? set.admin?.full_name ?? (ownerType === "USER" ? "User" : "Admin");

      return {
        id: set.id,
        title: set.title,
        description: set.description,
        cover_image_url: set.cover_image_url,
        card_count: set.card_count,
        status: set.status,
        visibility: set.visibility,
        is_system: set.is_system,
        ownerType,
        ownerId: set.owner_user_id ?? set.owner_admin_id,
        ownerName,
        warnedAt: set.warned_at,
        created_at: set.created_at,
        deleted_at: set.deleted_at,
      };
    });

    return res.status(200).json({
      message: "Lấy danh sách bộ từ vựng thành công.",
      statusCode: 200,
      data: normalizedSets,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách vocab set:", error);
    return res.status(500).json({
      message: "Không thể lấy danh sách bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getSystemVocabSetDetail = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({
        message: "setId không hợp lệ.",
        statusCode: 400,
      });
    }

    const set = await prisma.flashcard_sets.findFirst({
      where: {
        id: setId,
        OR: [
          {
            is_system: true,
          },
          {
            owner_user_id: {
              not: null,
            },
            visibility: "PUBLIC",
          },
          {
            owner_user_id: {
              not: null,
            },
            warned_at: {
              not: null,
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        cover_image_url: true,
        status: true,
        card_count: true,
        created_at: true,
        flashcards: {
          orderBy: {
            id: "asc",
          },
          select: {
            id: true,
            word: true,
            word_type: true,
            pronunciation: true,
            definition: true,
            example: true,
            image_url: true,
            audio_url: true,
          },
        },
      },
    });

    if (!set) {
      return res.status(404).json({
        message: "Không tìm thấy bộ từ vựng.",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      message: "Lấy chi tiết bộ từ vựng thành công.",
      statusCode: 200,
      data: set,
    });
  } catch (error) {
    console.error("Lỗi chi tiết vocab set:", error);
    return res.status(500).json({
      message: "Không thể lấy chi tiết bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const createSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : null;
    const coverImageUrl = typeof req.body.coverImageUrl === "string" ? req.body.coverImageUrl.trim() : null;
    const ownerAdminId = parseIntParam(req.body.ownerAdminId);
    const cards = Array.isArray(req.body.cards) ? req.body.cards : [];

    if (!title) {
      return res.status(400).json({ message: "Tiêu đề bộ từ vựng là bắt buộc.", statusCode: 400 });
    }

    if (!isHttpUrl(coverImageUrl)) {
      return res.status(400).json({ message: "Cover image URL không hợp lệ.", statusCode: 400 });
    }

    const normalizedCards = cards
      .map((item: any) => ({
        word: typeof item.word === "string" ? item.word.trim() : "",
        word_type: typeof item.word_type === "string" ? item.word_type.trim() : null,
        pronunciation: typeof item.pronunciation === "string" ? item.pronunciation.trim() : null,
        definition: typeof item.definition === "string" ? item.definition.trim() : "",
        example: typeof item.example === "string" ? item.example.trim() : null,
        image_url: typeof item.image_url === "string" ? item.image_url.trim() : null,
        audio_url: typeof item.audio_url === "string" ? item.audio_url.trim() : null,
      }))
      .filter((item) => item.word && item.definition);

    for (const card of normalizedCards) {
      if (!isHttpUrl(card.image_url) || !isHttpUrl(card.audio_url)) {
        return res.status(400).json({
          message: `URL ảnh/audio không hợp lệ cho từ ${card.word}.`,
          statusCode: 400,
        });
      }
    }

    const set = await prisma.$transaction(async (tx) => {
      const createdSet = await tx.flashcard_sets.create({
        data: {
          title,
          description,
          cover_image_url: coverImageUrl,
          status: "HIDDEN",
          visibility: "PUBLIC",
          is_system: true,
          owner_admin_id: Number.isNaN(ownerAdminId) ? null : ownerAdminId,
          card_count: normalizedCards.length,
        },
      });

      if (normalizedCards.length > 0) {
        await tx.flashcards.createMany({
          data: normalizedCards.map((item) => ({
            ...item,
            set_id: createdSet.id,
          })),
        });
      }

      return createdSet;
    });

    return res.status(201).json({
      message: "Tạo bộ từ vựng hệ thống thành công.",
      statusCode: 201,
      data: {
        id: set.id,
        title: set.title,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo vocab set:", error);
    return res.status(500).json({
      message: "Không thể tạo bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const importSystemVocabSet = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng tải file Excel/CSV.", statusCode: 400 });
    }

    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      return res.status(400).json({ message: "Tiêu đề bộ từ vựng là bắt buộc.", statusCode: 400 });
    }

    const fileName = req.file.originalname.toLowerCase();
    const cards: ImportCard[] = [];

    if (fileName.endsWith(".xlsx")) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(req.file.buffer) as any);
      const worksheet = workbook.worksheets[0] ?? workbook.getWorksheet(1);

      if (!worksheet) {
        return res.status(400).json({ message: "Không đọc được worksheet.", statusCode: 400 });
      }

      const headerRow = worksheet.getRow(1);
      const headers: Record<string, number> = {};
      headerRow.eachCell((cell, colNumber) => {
        const key = String(cell.value ?? "").trim();
        if (key) {
          headers[key] = colNumber;
        }
      });

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        const word = String(row.getCell(headers.Word ?? 1).value ?? "").trim();
        const definition = String(row.getCell(headers.Definition ?? 2).value ?? "").trim();
        const imageUrl = String(row.getCell(headers.Image_URL ?? 3).value ?? "").trim();
        const audioUrl = String(row.getCell(headers.Audio_URL ?? 4).value ?? "").trim();

        if (!word && !definition) {
          continue;
        }

        if (!word || !definition) {
          return res.status(400).json({
            message: `Dòng ${rowIndex}: thiếu Word hoặc Definition.`,
            statusCode: 400,
          });
        }

        if (!isHttpUrl(imageUrl || null) || !isHttpUrl(audioUrl || null)) {
          return res.status(400).json({
            message: `Dòng ${rowIndex}: URL ảnh/audio không hợp lệ.`,
            statusCode: 400,
          });
        }

        cards.push({
          word,
          definition,
          word_type: String(row.getCell(headers.Word_Type ?? 5).value ?? "").trim() || null,
          pronunciation: String(row.getCell(headers.Pronunciation ?? 6).value ?? "").trim() || null,
          example: String(row.getCell(headers.Example ?? 7).value ?? "").trim() || null,
          image_url: imageUrl || null,
          audio_url: audioUrl || null,
        });
      }
    } else if (fileName.endsWith(".csv")) {
      const csvText = req.file.buffer.toString("utf8");
      const rows = parseCsvRows(csvText);
      if (rows.length < 2) {
        return res.status(400).json({ message: "File CSV không có dữ liệu.", statusCode: 400 });
      }

      const headers = rows[0];
      const indexOf = (key: string) => headers.findIndex((item) => item.toLowerCase() === key.toLowerCase());
      const wordIndex = indexOf("word");
      const definitionIndex = indexOf("definition");
      const imageIndex = indexOf("image_url");
      const audioIndex = indexOf("audio_url");
      const typeIndex = indexOf("word_type");
      const pronIndex = indexOf("pronunciation");
      const exampleIndex = indexOf("example");

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const word = String(row[wordIndex] ?? "").trim();
        const definition = String(row[definitionIndex] ?? "").trim();
        const imageUrl = String(row[imageIndex] ?? "").trim();
        const audioUrl = String(row[audioIndex] ?? "").trim();

        if (!word && !definition) {
          continue;
        }

        if (!word || !definition) {
          return res.status(400).json({ message: `Dòng ${i + 1}: thiếu Word hoặc Definition.`, statusCode: 400 });
        }

        if (!isHttpUrl(imageUrl || null) || !isHttpUrl(audioUrl || null)) {
          return res.status(400).json({ message: `Dòng ${i + 1}: URL ảnh/audio không hợp lệ.`, statusCode: 400 });
        }

        cards.push({
          word,
          definition,
          word_type: String(row[typeIndex] ?? "").trim() || null,
          pronunciation: String(row[pronIndex] ?? "").trim() || null,
          example: String(row[exampleIndex] ?? "").trim() || null,
          image_url: imageUrl || null,
          audio_url: audioUrl || null,
        });
      }
    } else {
      return res.status(400).json({ message: "Chỉ hỗ trợ .xlsx hoặc .csv.", statusCode: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const set = await tx.flashcard_sets.create({
        data: {
          title,
          description: typeof req.body.description === "string" ? req.body.description.trim() : null,
          status: "HIDDEN",
          visibility: "PUBLIC",
          is_system: true,
          card_count: cards.length,
        },
      });

      if (cards.length > 0) {
        await tx.flashcards.createMany({
          data: cards.map((item) => ({
            ...item,
            set_id: set.id,
          })),
        });
      }

      return set;
    });

    return res.status(200).json({
      message: "Import bộ từ vựng thành công, dữ liệu đã lưu ở trạng thái Private.",
      statusCode: 200,
      data: {
        setId: created.id,
        totalCards: cards.length,
      },
    });
  } catch (error) {
    console.error("Lỗi import vocab:", error);
    return res.status(500).json({
      message: "Không thể import bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const updateSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ.", statusCode: 400 });
    }

    const targetSet = await prisma.flashcard_sets.findUnique({
      where: { id: setId },
      select: {
        id: true,
        owner_user_id: true,
        is_system: true,
      },
    });

    if (!targetSet) {
      return res.status(404).json({ message: "Không tìm thấy bộ từ vựng.", statusCode: 404 });
    }

    if (targetSet.owner_user_id) {
      return res.status(403).json({
        message: "Bộ từ vựng do user đăng chỉ cho phép cảnh báo/xóa, không cho chỉnh sửa.",
        statusCode: 403,
      });
    }

    const title = typeof req.body.title === "string" ? req.body.title.trim() : undefined;
    const description = typeof req.body.description === "string" ? req.body.description.trim() : undefined;
    const coverImageUrl = typeof req.body.coverImageUrl === "string" ? req.body.coverImageUrl.trim() : undefined;
    const cards = Array.isArray(req.body.cards) ? req.body.cards : undefined;

    if (coverImageUrl !== undefined && !isHttpUrl(coverImageUrl)) {
      return res.status(400).json({ message: "Cover image URL không hợp lệ.", statusCode: 400 });
    }

    const normalizedCards = cards
      ? cards
          .map((item: any) => ({
            word: typeof item.word === "string" ? item.word.trim() : "",
            word_type: typeof item.word_type === "string" ? item.word_type.trim() : null,
            pronunciation: typeof item.pronunciation === "string" ? item.pronunciation.trim() : null,
            definition: typeof item.definition === "string" ? item.definition.trim() : "",
            example: typeof item.example === "string" ? item.example.trim() : null,
            image_url: typeof item.image_url === "string" ? item.image_url.trim() : null,
            audio_url: typeof item.audio_url === "string" ? item.audio_url.trim() : null,
          }))
          .filter((item) => item.word && item.definition)
      : undefined;

    if (normalizedCards) {
      for (const card of normalizedCards) {
        if (!isHttpUrl(card.image_url) || !isHttpUrl(card.audio_url)) {
          return res.status(400).json({
            message: `URL ảnh/audio không hợp lệ cho từ ${card.word}.`,
            statusCode: 400,
          });
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title) {
      updateData.title = title;
    }
    if (description !== undefined) {
      updateData.description = description || null;
    }
    if (coverImageUrl !== undefined) {
      updateData.cover_image_url = coverImageUrl || null;
    }

    if (normalizedCards !== undefined) {
      updateData.card_count = normalizedCards.length;
    }

    if (Object.keys(updateData).length === 0 && normalizedCards === undefined) {
      return res.status(400).json({ message: "Không có dữ liệu để cập nhật.", statusCode: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSet = await tx.flashcard_sets.update({
        where: {
          id: setId,
        },
        data: updateData,
        select: {
          id: true,
          title: true,
          status: true,
        },
      });

      if (normalizedCards !== undefined) {
        await tx.flashcards.deleteMany({
          where: {
            set_id: setId,
          },
        });

        if (normalizedCards.length > 0) {
          await tx.flashcards.createMany({
            data: normalizedCards.map((card) => ({
              ...card,
              set_id: setId,
            })),
          });
        }
      }

      return updatedSet;
    });

    return res.status(200).json({ message: "Cập nhật bộ từ vựng thành công.", statusCode: 200, data: updated });
  } catch (error) {
    console.error("Lỗi cập nhật vocab set:", error);
    return res.status(500).json({
      message: "Không thể cập nhật bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const updateSystemVocabSetStatus = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    const status = typeof req.body.status === "string" ? req.body.status.trim().toUpperCase() : "";

    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ.", statusCode: 400 });
    }

    const targetSet = await prisma.flashcard_sets.findUnique({
      where: { id: setId },
      select: {
        id: true,
        owner_user_id: true,
      },
    });

    if (!targetSet) {
      return res.status(404).json({ message: "Không tìm thấy bộ từ vựng.", statusCode: 404 });
    }

    if (!VALID_SET_STATUSES.includes(status as (typeof VALID_SET_STATUSES)[number])) {
      return res.status(400).json({
        message: "status chỉ chấp nhận DRAFT, PUBLISHED hoặc HIDDEN.",
        statusCode: 400,
      });
    }

    const isUserSet = !!targetSet.owner_user_id;

    const updateData: {
      status: string;
      deleted_at: null;
      visibility?: "PUBLIC" | "PRIVATE";
      warned_at?: null;
    } = {
      status,
      deleted_at: null,
    };

    if (isUserSet) {
      if (status === "PUBLISHED") {
        updateData.visibility = "PUBLIC";
      } else {
        updateData.visibility = "PRIVATE";
      }
      // Any manual status change by admin clears warning flag.
      updateData.warned_at = null;
    }

    const updated = await prisma.flashcard_sets.update({
      where: { id: setId },
      data: updateData,
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return res.status(200).json({
      message: "Cập nhật trạng thái bộ từ vựng thành công.",
      statusCode: 200,
      data: updated,
    });
  } catch (error) {
    console.error("Lỗi cập nhật status vocab:", error);
    return res.status(500).json({
      message: "Không thể cập nhật trạng thái bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const softDeleteSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ.", statusCode: 400 });
    }

    const updated = await prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        status: "DELETED",
        deleted_at: new Date(),
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return res.status(200).json({ message: "Xóa mềm bộ từ vựng thành công.", statusCode: 200, data: updated });
  } catch (error) {
    console.error("Lỗi xóa mềm vocab:", error);
    return res.status(500).json({
      message: "Không thể xóa mềm bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const warnUserVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ.", statusCode: 400 });
    }

    const set = await prisma.flashcard_sets.findFirst({
      where: {
        id: setId,
        owner_user_id: {
          not: null,
        },
        visibility: "PUBLIC",
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        owner_user_id: true,
      },
    });

    if (!set) {
      return res.status(404).json({
        message: "Không tìm thấy bộ flashcard public của user để cảnh báo.",
        statusCode: 404,
      });
    }

    const now = new Date();
    await prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        warned_at: now,
        // Keep warned sets visible on admin side while hiding from user public discovery.
        visibility: "PRIVATE",
        status: "HIDDEN",
      },
    });

    return res.status(200).json({
      message: "Đã cảnh báo user về bộ flashcard không hợp lệ.",
      statusCode: 200,
      data: {
        setId: set.id,
        title: set.title,
        ownerUserId: set.owner_user_id,
        warnedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Lỗi cảnh báo bộ flashcard user:", error);
    return res.status(500).json({
      message: "Không thể cảnh báo user.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const restoreSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ.", statusCode: 400 });
    }

    const updated = await prisma.flashcard_sets.update({
      where: { id: setId },
      data: {
        status: "HIDDEN",
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return res.status(200).json({ message: "Khôi phục bộ từ vựng thành công.", statusCode: 200, data: updated });
  } catch (error) {
    console.error("Lỗi khôi phục vocab:", error);
    return res.status(500).json({
      message: "Không thể khôi phục bộ từ vựng.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};
