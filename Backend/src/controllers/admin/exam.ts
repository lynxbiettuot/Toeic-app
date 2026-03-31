import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma.js";

const REQUIRED_HEADERS = [
  "Question_No",
  "Part",
  "Correct",
];

const VALID_EXAM_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;

type HeaderMap = Record<string, number>;

const isHttpUrl = (value: string | null | undefined): boolean => {
  if (!value) {
    return true;
  }

  return /^https?:\/\//i.test(value.trim());
};

const parseIntParam = (value: string | string[] | undefined): number => {
  const normalized = Array.isArray(value) ? value[0] : value;
  return Number.parseInt(normalized ?? "", 10);
};

const normalizeCellValue = (value: unknown): string | number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "(trống)") {
      return null;
    }

    return trimmed;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return normalizeCellValue(value.text);
    }

    if (
      "text" in value &&
      value.text &&
      typeof value.text === "object" &&
      "richText" in value.text &&
      Array.isArray(value.text.richText)
    ) {
      const nestedRichTextValue = value.text.richText
        .map((item: { text?: string }) => item.text ?? "")
        .join("");

      return normalizeCellValue(nestedRichTextValue);
    }

    if ("result" in value && (typeof value.result === "string" || typeof value.result === "number")) {
      return normalizeCellValue(value.result);
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      const richTextValue = value.richText
        .map((item: { text?: string }) => item.text ?? "")
        .join("");

      return normalizeCellValue(richTextValue);
    }

    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return normalizeCellValue(value.hyperlink);
    }
  }

  return String(value).trim() || null;
};

const getHeaderMap = (worksheet: ExcelJS.Worksheet): HeaderMap => {
  const headerRow = worksheet.getRow(1);
  const headerMap: HeaderMap = {};

  headerRow.eachCell((cell, colNumber) => {
    const headerValue = normalizeCellValue(cell.value);
    if (typeof headerValue === "string") {
      headerMap[headerValue] = colNumber;
    }
  });

  return headerMap;
};

const getCellValue = (
  row: ExcelJS.Row,
  headerMap: HeaderMap,
  headerName: string,
): string | number | null => {
  const colNumber = headerMap[headerName];
  if (!colNumber) {
    return null;
  }

  return normalizeCellValue(row.getCell(colNumber).value);
};

const parseIntegerField = (value: unknown, fallback?: number): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const splitPipeSeparatedValues = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
};

const mergePipeSeparatedValues = (...values: Array<string | null | undefined>): string | null => {
  const merged = Array.from(new Set(values.flatMap((value) => splitPipeSeparatedValues(value))));
  return merged.length > 0 ? merged.join(" | ") : null;
};

const ensureExcelFile = (req: Request, res: Response): req is Request & { file: Express.Multer.File } => {
  if (!req.file) {
    res.status(400).json({
      message: "Vui lòng upload file Excel với field excelFile.",
      statusCode: 400,
    });
    return false;
  }

  return true;
};

export const importExamFromExcel = async (req: Request, res: Response) => {
  if (!ensureExcelFile(req, res)) {
    return;
  }

  try {
    const { title, year, type, createdBy } = req.body;
    const fileName = req.file.originalname.toLowerCase();
    const requestedAdminId = parseIntegerField(createdBy, undefined);

    if (!title || !year) {
      return res.status(400).json({
        message: "Thiếu thông tin tiêu đề hoặc năm xuất bản.",
        statusCode: 400,
      });
    }

    if (!fileName.endsWith(".xlsx")) {
      return res.status(400).json({
        message: "Backend hiện chỉ hỗ trợ file .xlsx. Vui lòng đổi file sang định dạng .xlsx rồi thử lại.",
        statusCode: 400,
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(req.file.buffer) as any);

    const worksheet = workbook.worksheets[0] ?? workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(400).json({
        message: "Không đọc được sheet đầu tiên trong file Excel. Hãy kiểm tra lại file .xlsx và dữ liệu trong sheet đầu tiên.",
        statusCode: 400,
      });
    }

    const headerMap = getHeaderMap(worksheet);
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerMap[header]);
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: "File Excel thiếu các cột bắt buộc.",
        missingHeaders,
        statusCode: 400,
      });
    }

    const createdGroups: Record<string, number> = {};
    let createdQuestionCount = 0;
    let resolvedCreatedBy: number | undefined;

    if (requestedAdminId !== undefined) {
      const admin = await prisma.admins.findUnique({
        where: {
          id: requestedAdminId,
        },
        select: {
          id: true,
        },
      });

      resolvedCreatedBy = admin?.id;
    }

    const newExam = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam_sets.create({
        data: {
          title: String(title).trim(),
          year: parseIntegerField(year, undefined),
          type: type ? String(type).trim() : "TOEIC",
          created_by: resolvedCreatedBy,
          status: "DRAFT",
        },
      });

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);

        const questionNumber = parseIntegerField(getCellValue(row, headerMap, "Question_No"));
        if (!questionNumber) {
          break;
        }

        const partNumber = parseIntegerField(getCellValue(row, headerMap, "Part"), 0) ?? 0;
        const groupRefValue = getCellValue(row, headerMap, "Group_Ref");
        const groupRef = groupRefValue ? String(groupRefValue) : null;

        const groupImageUrl = getCellValue(row, headerMap, "Group_Image_URL")?.toString() ?? null;
        const groupAudioUrl = getCellValue(row, headerMap, "Group_Audio_URL")?.toString() ?? null;
        const questionImageUrl = getCellValue(row, headerMap, "Question_Image_URL")?.toString() ?? null;
        const questionAudioUrl = getCellValue(row, headerMap, "Question_Audio_URL")?.toString() ?? null;

        if (!isHttpUrl(groupImageUrl)) {
          throw new Error(`Dòng ${rowIndex}: URL ảnh nhóm không hợp lệ (chỉ chấp nhận HTTP/HTTPS).`);
        }

        if (!isHttpUrl(groupAudioUrl)) {
          throw new Error(`Dòng ${rowIndex}: URL audio nhóm không hợp lệ (chỉ chấp nhận HTTP/HTTPS).`);
        }

        if (!isHttpUrl(questionImageUrl)) {
          throw new Error(`Dòng ${rowIndex}: URL ảnh câu hỏi không hợp lệ (chỉ chấp nhận HTTP/HTTPS).`);
        }

        if (!isHttpUrl(questionAudioUrl)) {
          throw new Error(`Dòng ${rowIndex}: URL audio câu hỏi không hợp lệ (chỉ chấp nhận HTTP/HTTPS).`);
        }

        let currentGroupId: number | undefined;

        if (groupRef) {
          if (!createdGroups[groupRef]) {
            const newGroup = await tx.question_groups.create({
              data: {
                exam_set_id: exam.id,
                part_number: partNumber,
                passage_text: getCellValue(row, headerMap, "Group_Text")?.toString() ?? null,
                transcript: getCellValue(row, headerMap, "Group_Transcript")?.toString() ?? null,
                image_url: groupImageUrl,
                audio_url: groupAudioUrl,
              },
            });

            createdGroups[groupRef] = newGroup.id;
          }

          currentGroupId = createdGroups[groupRef];
        }

        const correctAnswer = getCellValue(row, headerMap, "Correct");
        if (!correctAnswer) {
          throw new Error(`Dòng ${rowIndex} thiếu đáp án đúng.`);
        }

        const newQuestion = await tx.questions.create({
          data: {
            exam_set_id: exam.id,
            group_id: currentGroupId,
            part_number: partNumber,
            question_number: questionNumber,
            content: getCellValue(row, headerMap, "Question_Text")?.toString() ?? null,
            transcript: getCellValue(row, headerMap, "Question_Transcript")?.toString() ?? null,
            image_url: questionImageUrl,
            audio_url: questionAudioUrl,
            correct_answer: String(correctAnswer).trim(),
            explanation: getCellValue(row, headerMap, "Explanation")?.toString() ?? null,
          },
        });

        const optionsData = [
          ["A", getCellValue(row, headerMap, "Opt_A")],
          ["B", getCellValue(row, headerMap, "Opt_B")],
          ["C", getCellValue(row, headerMap, "Opt_C")],
          ["D", getCellValue(row, headerMap, "Opt_D")],
        ] as const;

        const optionRows = optionsData
          .filter(([, value]) => value !== null)
          .map(([label, value]) => ({
            question_id: newQuestion.id,
            option_label: label,
            content: String(value).trim(),
          }));

        if (optionRows.length > 0) {
          await tx.answer_options.createMany({
            data: optionRows,
          });
        }

        createdQuestionCount += 1;
      }

      if (createdQuestionCount !== 200) {
        throw new Error(`Đề thi TOEIC không hợp lệ. Tổng số câu hỏi bóc tách được phải là 200 câu (Hiện có: ${createdQuestionCount} câu).`);
      }

      return exam;
    });

    return res.status(200).json({
      message: "Import đề thi và bóc tách dữ liệu thành công 100%.",
      statusCode: 200,
      data: {
        examId: newExam.id,
        title: newExam.title,
        createdBy: resolvedCreatedBy ?? null,
        totalImportedQuestions: createdQuestionCount,
      },
    });
  } catch (error) {
    console.error("Lỗi import đề thi:", error);
    return res.status(500).json({
      message: "Có lỗi xảy ra, toàn bộ dữ liệu đang import đã được hủy (rollback) an toàn.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getAdminExamList = async (req: Request, res: Response) => {
  try {
    const keyword = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const year = typeof req.query.year === "string" ? Number.parseInt(req.query.year, 10) : undefined;

    const where: Record<string, unknown> = {};

    if (status === "PRIVATE") {
      where.status = {
        in: ["DRAFT", "HIDDEN"],
      };
    } else if (status === "PUBLIC") {
      where.status = "PUBLISHED";
    } else if (VALID_EXAM_STATUSES.includes(status as (typeof VALID_EXAM_STATUSES)[number])) {
      where.status = status;
    }

    if (year !== undefined && !Number.isNaN(year)) {
      where.year = year;
    }

    if (keyword) {
      where.title = {
        contains: keyword,
      };
    }

    const exams = await prisma.exam_sets.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        status: true,
        total_questions: true,
        created_at: true,
      },
    });

    return res.status(200).json({
      message: "Lấy danh sách đề thi thành công.",
      statusCode: 200,
      data: exams,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đề:", error);
    return res.status(500).json({
      message: "Không thể lấy danh sách đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getExamQuestions = async (req: Request, res: Response) => {
  try {
    const examSetIdParam = Array.isArray(req.params.examSetId)
      ? req.params.examSetId[0]
      : req.params.examSetId;
    const examSetId = Number.parseInt(examSetIdParam, 10);
    if (Number.isNaN(examSetId)) {
      return res.status(400).json({
        message: "examSetId không hợp lệ.",
        statusCode: 400,
      });
    }

    const exam = await prisma.exam_sets.findUnique({
      where: { id: examSetId },
      select: {
        id: true,
        title: true,
        year: true,
        status: true,
        questions: {
          orderBy: {
            question_number: "asc",
          },
          select: {
            id: true,
            question_number: true,
            part_number: true,
          },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({
        message: "Không tìm thấy đề thi.",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      message: "Lấy danh sách câu hỏi thành công.",
      statusCode: 200,
      data: exam,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách câu hỏi:", error);
    return res.status(500).json({
      message: "Không thể lấy danh sách câu hỏi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getQuestionDetail = async (req: Request, res: Response) => {
  try {
    const examSetIdParam = Array.isArray(req.params.examSetId)
      ? req.params.examSetId[0]
      : req.params.examSetId;
    const questionNumberParam = Array.isArray(req.params.questionNumber)
      ? req.params.questionNumber[0]
      : req.params.questionNumber;

    const examSetId = Number.parseInt(examSetIdParam, 10);
    const questionNumber = Number.parseInt(questionNumberParam, 10);

    if (Number.isNaN(examSetId) || Number.isNaN(questionNumber)) {
      return res.status(400).json({
        message: "examSetId hoặc questionNumber không hợp lệ.",
        statusCode: 400,
      });
    }

    const question = await prisma.questions.findFirst({
      where: {
        exam_set_id: examSetId,
        question_number: questionNumber,
      },
      select: {
        id: true,
        question_number: true,
        part_number: true,
        content: true,
        transcript: true,
        image_url: true,
        audio_url: true,
        correct_answer: true,
        explanation: true,
        answers: {
          orderBy: {
            option_label: "asc",
          },
          select: {
            option_label: true,
            content: true,
          },
        },
        group: {
          select: {
            id: true,
            passage_text: true,
            transcript: true,
            image_url: true,
            audio_url: true,
          },
        },
      },
    });

    if (!question) {
      return res.status(404).json({
        message: "Không tìm thấy câu hỏi.",
        statusCode: 404,
      });
    }

    const resolvedImageUrl = mergePipeSeparatedValues(
      question.group?.image_url ?? null,
      question.image_url,
    );
    const resolvedAudioUrl = question.audio_url ?? question.group?.audio_url ?? null;
    const resolvedTranscript = question.transcript ?? question.group?.transcript ?? null;

    const normalizedQuestion = {
      ...question,
      image_url: resolvedImageUrl,
      audio_url: resolvedAudioUrl,
      transcript: resolvedTranscript,
      original_question_image_url: question.image_url,
      original_question_audio_url: question.audio_url,
      original_question_transcript: question.transcript,
      inherited_from_group: {
        image_url: !question.image_url && !!question.group?.image_url,
        audio_url: !question.audio_url && !!question.group?.audio_url,
        transcript: !question.transcript && !!question.group?.transcript,
      },
    };

    return res.status(200).json({
      message: "Lấy chi tiết câu hỏi thành công.",
      statusCode: 200,
      data: normalizedQuestion,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết câu hỏi:", error);
    return res.status(500).json({
      message: "Không thể lấy chi tiết câu hỏi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const createManualExam = async (req: Request, res: Response) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const year = parseIntegerField(req.body.year, undefined);
    const type = typeof req.body.type === "string" && req.body.type.trim() ? req.body.type.trim() : "TOEIC";

    if (!title) {
      return res.status(400).json({
        message: "Tên đề thi là bắt buộc.",
        statusCode: 400,
      });
    }

    const exam = await prisma.exam_sets.create({
      data: {
        title,
        year,
        type,
        status: "DRAFT",
      },
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        status: true,
        created_at: true,
      },
    });

    return res.status(201).json({
      message: "Tạo đề thi nháp thành công.",
      statusCode: 201,
      data: exam,
    });
  } catch (error) {
    console.error("Lỗi tạo đề thủ công:", error);
    return res.status(500).json({
      message: "Không thể tạo đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    if (Number.isNaN(examSetId)) {
      return res.status(400).json({
        message: "examSetId không hợp lệ.",
        statusCode: 400,
      });
    }

    const title = typeof req.body.title === "string" ? req.body.title.trim() : undefined;
    const year = req.body.year === undefined ? undefined : parseIntegerField(req.body.year, undefined);
    const type = typeof req.body.type === "string" ? req.body.type.trim() : undefined;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined && title !== "") {
      updateData.title = title;
    }
    if (year !== undefined) {
      updateData.year = year;
    }
    if (type !== undefined && type !== "") {
      updateData.type = type;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Không có dữ liệu hợp lệ để cập nhật đề thi.",
        statusCode: 400,
      });
    }

    const updated = await prisma.exam_sets.update({
      where: {
        id: examSetId,
      },
      data: updateData,
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        status: true,
        deleted_at: true,
        updated_at: true,
      },
    });

    return res.status(200).json({
      message: "Cập nhật đề thi thành công.",
      statusCode: 200,
      data: updated,
    });
  } catch (error) {
    console.error("Lỗi cập nhật đề thi:", error);
    return res.status(500).json({
      message: "Không thể cập nhật đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const updateExamStatus = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    const status = typeof req.body.status === "string" ? req.body.status.trim().toUpperCase() : "";

    if (Number.isNaN(examSetId)) {
      return res.status(400).json({
        message: "examSetId không hợp lệ.",
        statusCode: 400,
      });
    }

    if (!VALID_EXAM_STATUSES.includes(status as (typeof VALID_EXAM_STATUSES)[number])) {
      return res.status(400).json({
        message: "status chỉ chấp nhận DRAFT, PUBLISHED hoặc HIDDEN.",
        statusCode: 400,
      });
    }

    if (status === "PUBLISHED") {
      const questionCount = await prisma.questions.count({
        where: { exam_set_id: examSetId },
      });

      if (questionCount !== 200) {
        return res.status(400).json({
          message: `Không thể công khai đề thi. Đề thi phải có đủ 200 câu hỏi trước khi xuất bản (Hiện có: ${questionCount} câu).`,
          statusCode: 400,
        });
      }
    }

    const updated = await prisma.exam_sets.update({
      where: {
        id: examSetId,
      },
      data: {
        status,
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        deleted_at: true,
      },
    });

    return res.status(200).json({
      message: "Cập nhật trạng thái đề thi thành công.",
      statusCode: 200,
      data: updated,
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đề thi:", error);
    return res.status(500).json({
      message: "Không thể cập nhật trạng thái đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const softDeleteExam = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);

    if (Number.isNaN(examSetId)) {
      return res.status(400).json({
        message: "examSetId không hợp lệ.",
        statusCode: 400,
      });
    }

    // Hard delete: delete all associated data
    await prisma.$transaction(async (tx) => {
      // Get all sessions for this exam to delete answers
      const sessions = await tx.test_sessions.findMany({
        where: { exam_set_id: examSetId },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      // Delete user answers
      if (sessionIds.length > 0) {
        await tx.user_answers.deleteMany({
          where: {
            session_id: { in: sessionIds },
          },
        });

        // Delete session part scores
        await tx.session_part_scores.deleteMany({
          where: {
            session_id: { in: sessionIds },
          },
        });
      }

      // Delete test sessions
      await tx.test_sessions.deleteMany({
        where: {
          exam_set_id: examSetId,
        },
      });

      // Delete answer options before deleting questions (FK constraint)
      await tx.answer_options.deleteMany({
        where: {
          question: {
            exam_set_id: examSetId,
          },
        },
      });

      // Delete questions
      await tx.questions.deleteMany({
        where: {
          exam_set_id: examSetId,
        },
      });

      // Delete question groups
      await tx.question_groups.deleteMany({
        where: {
          exam_set_id: examSetId,
        },
      });

      // Delete the exam set
      await tx.exam_sets.delete({
        where: {
          id: examSetId,
        },
      });
    });

    return res.status(200).json({
      message: "Xóa đề thi thành công.",
      statusCode: 200,
      data: { id: examSetId },
    });
  } catch (error) {
    console.error("Lỗi xóa đề thi:", error);
    return res.status(500).json({
      message: "Không thể xóa đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const restoreExam = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);

    if (Number.isNaN(examSetId)) {
      return res.status(400).json({
        message: "examSetId không hợp lệ.",
        statusCode: 400,
      });
    }

    const updated = await prisma.exam_sets.update({
      where: {
        id: examSetId,
      },
      data: {
        status: "HIDDEN",
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        deleted_at: true,
      },
    });

    return res.status(200).json({
      message: "Khôi phục đề thi thành công.",
      statusCode: 200,
      data: updated,
    });
  } catch (error) {
    console.error("Lỗi khôi phục đề thi:", error);
    return res.status(500).json({
      message: "Không thể khôi phục đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);

    if (Number.isNaN(examSetId)) {
      return res.status(400).json({
        message: "examSetId không hợp lệ.",
        statusCode: 400,
      });
    }

    const exam = await prisma.exam_sets.findUnique({
      where: {
        id: examSetId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!exam) {
      return res.status(404).json({
        message: "Không tìm thấy đề thi.",
        statusCode: 404,
      });
    }

    if (exam.status === "PUBLISHED") {
      return res.status(400).json({
        message: "Đề thi đang ở chế độ Công khai, không thể thêm câu hỏi mới.",
        statusCode: 400,
      });
    }

    const partNumber = parseIntegerField(req.body.part_number, 5) ?? 5;
    if (partNumber < 1 || partNumber > 7) {
      return res.status(400).json({
        message: "part_number phải nằm trong khoảng từ 1 đến 7.",
        statusCode: 400,
      });
    }

    const content =
      req.body.content === null || req.body.content === undefined
        ? null
        : String(req.body.content).trim() || null;
    const transcript =
      req.body.transcript === null || req.body.transcript === undefined
        ? null
        : String(req.body.transcript).trim() || null;
    const imageUrl =
      req.body.image_url === null || req.body.image_url === undefined
        ? null
        : String(req.body.image_url).trim() || null;
    const audioUrl =
      req.body.audio_url === null || req.body.audio_url === undefined
        ? null
        : String(req.body.audio_url).trim() || null;
    const explanation =
      req.body.explanation === null || req.body.explanation === undefined
        ? null
        : String(req.body.explanation).trim() || null;
    const correctAnswer =
      typeof req.body.correct_answer === "string" && req.body.correct_answer.trim()
        ? req.body.correct_answer.trim().toUpperCase()
        : "A";

    if (!isHttpUrl(imageUrl)) {
      return res.status(400).json({
        message: "image_url phải bắt đầu bằng HTTP/HTTPS.",
        statusCode: 400,
      });
    }

    if (!isHttpUrl(audioUrl)) {
      return res.status(400).json({
        message: "audio_url phải bắt đầu bằng HTTP/HTTPS.",
        statusCode: 400,
      });
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      return res.status(400).json({
        message: "correct_answer chỉ chấp nhận A, B, C hoặc D.",
        statusCode: 400,
      });
    }

    const incomingAnswers = Array.isArray(req.body.answers)
      ? (req.body.answers as Array<{ option_label?: string; content?: string }>)
      : [];

    const normalizedAnswers = ["A", "B", "C", "D"].map((label) => {
      const found = incomingAnswers.find(
        (answer) => String(answer.option_label ?? "").trim().toUpperCase() === label,
      );
      return {
        option_label: label,
        content: String(found?.content ?? "").trim(),
      };
    });

    if (normalizedAnswers.some((answer) => !answer.content)) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ nội dung cho 4 đáp án A, B, C, D.",
        statusCode: 400,
      });
    }

    const latestQuestion = await prisma.questions.findFirst({
      where: {
        exam_set_id: examSetId,
      },
      orderBy: {
        question_number: "desc",
      },
      select: {
        question_number: true,
      },
    });

    const nextQuestionNumber = (latestQuestion?.question_number ?? 0) + 1;

    const createdQuestion = await prisma.$transaction(async (tx) => {
      const question = await tx.questions.create({
        data: {
          exam_set_id: examSetId,
          part_number: partNumber,
          question_number: nextQuestionNumber,
          content,
          transcript,
          image_url: imageUrl,
          audio_url: audioUrl,
          explanation,
          correct_answer: correctAnswer,
        },
        select: {
          id: true,
          question_number: true,
          part_number: true,
          correct_answer: true,
        },
      });

      await tx.answer_options.createMany({
        data: normalizedAnswers.map((answer) => ({
          question_id: question.id,
          option_label: answer.option_label,
          content: answer.content,
        })),
      });

      return question;
    });

    return res.status(201).json({
      message: "Thêm câu hỏi thành công.",
      statusCode: 201,
      data: createdQuestion,
    });
  } catch (error) {
    console.error("Lỗi thêm câu hỏi:", error);
    return res.status(500).json({
      message: "Không thể thêm câu hỏi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const updateQuestionDetail = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    const questionNumber = parseIntParam(req.params.questionNumber);

    if (Number.isNaN(examSetId) || Number.isNaN(questionNumber)) {
      return res.status(400).json({
        message: "examSetId hoặc questionNumber không hợp lệ.",
        statusCode: 400,
      });
    }

    const question = await prisma.questions.findFirst({
      where: {
        exam_set_id: examSetId,
        question_number: questionNumber,
      },
      select: {
        id: true,
      },
    });

    if (!question) {
      return res.status(404).json({
        message: "Không tìm thấy câu hỏi cần cập nhật.",
        statusCode: 404,
      });
    }

    const updateData: Record<string, unknown> = {};
    const stringFields = ["content", "transcript", "image_url", "audio_url", "explanation", "correct_answer"] as const;

    for (const field of stringFields) {
      if (req.body[field] !== undefined) {
        const normalized = req.body[field] === null ? null : String(req.body[field]).trim();
        updateData[field] = normalized === "" ? null : normalized;
      }
    }

    if (req.body.part_number !== undefined) {
      const partNumber = parseIntegerField(req.body.part_number, undefined);
      if (partNumber !== undefined) {
        if (partNumber < 1 || partNumber > 7) {
          return res.status(400).json({
            message: "part_number phải nằm trong khoảng từ 1 đến 7.",
            statusCode: 400,
          });
        }
        updateData.part_number = partNumber;
      }
    }

    if (updateData.image_url !== undefined && !isHttpUrl((updateData.image_url as string | null) ?? null)) {
      return res.status(400).json({
        message: "image_url phải bắt đầu bằng HTTP/HTTPS.",
        statusCode: 400,
      });
    }

    if (updateData.audio_url !== undefined && !isHttpUrl((updateData.audio_url as string | null) ?? null)) {
      return res.status(400).json({
        message: "audio_url phải bắt đầu bằng HTTP/HTTPS.",
        statusCode: 400,
      });
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.questions.update({
          where: {
            id: question.id,
          },
          data: updateData,
        });
      }

      if (Array.isArray(req.body.answers)) {
        for (const answer of req.body.answers as Array<{ option_label?: string; content?: string }>) {
          const label = String(answer.option_label ?? "").trim().toUpperCase();
          const content = String(answer.content ?? "").trim();

          if (!["A", "B", "C", "D"].includes(label) || !content) {
            continue;
          }

          await tx.answer_options.upsert({
            where: {
              question_id_option_label: {
                question_id: question.id,
                option_label: label,
              },
            },
            update: {
              content,
            },
            create: {
              question_id: question.id,
              option_label: label,
              content,
            },
          });
        }
      }
    });

    return res.status(200).json({
      message: "Cập nhật câu hỏi thành công.",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Lỗi cập nhật câu hỏi:", error);
    return res.status(500).json({
      message: "Không thể cập nhật câu hỏi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};
