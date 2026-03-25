import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma.js";

const REQUIRED_HEADERS = [
  "Question_No",
  "Part",
  "Correct",
];

type HeaderMap = Record<string, number>;

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

        let currentGroupId: number | undefined;

        if (groupRef) {
          if (!createdGroups[groupRef]) {
            const newGroup = await tx.question_groups.create({
              data: {
                exam_set_id: exam.id,
                part_number: partNumber,
                passage_text: getCellValue(row, headerMap, "Group_Text")?.toString() ?? null,
                transcript: getCellValue(row, headerMap, "Group_Transcript")?.toString() ?? null,
                image_url: getCellValue(row, headerMap, "Group_Image_URL")?.toString() ?? null,
                audio_url: getCellValue(row, headerMap, "Group_Audio_URL")?.toString() ?? null,
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
            image_url: getCellValue(row, headerMap, "Question_Image_URL")?.toString() ?? null,
            audio_url: getCellValue(row, headerMap, "Question_Audio_URL")?.toString() ?? null,
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

export const getAdminExamList = async (_req: Request, res: Response) => {
  try {
    const exams = await prisma.exam_sets.findMany({
      where: {
        deleted_at: null,
      },
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
