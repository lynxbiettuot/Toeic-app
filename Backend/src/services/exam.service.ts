import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import {
  isHttpUrl,
  mergePipeSeparatedValues,
  splitPipeSeparatedValues,
  getQuestionMedia
} from "../utils/media.utils.js";
import {
  parseIntegerField,
  normalizeCellValue
} from "../utils/params.utils.js";

const REQUIRED_HEADERS = ["Question_No", "Part", "Correct"];
const VALID_EXAM_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;

export class ExamService {
  /**
   * Lấy danh sách đề thi cho Admin với các bộ lọc
   */
  static async getAdminExams(filters: { search?: string; status?: string; year?: number }) {
    const { search, status, year } = filters;
    const where: any = {
      status: { not: "DELETED" }
    };

    if (status === "PRIVATE") {
      where.status = { in: ["DRAFT", "HIDDEN"] };
    } else if (status === "PUBLIC") {
      where.status = "PUBLISHED";
    } else if (status && VALID_EXAM_STATUSES.includes(status as any)) {
      where.status = status;
    }

    if (year && !Number.isNaN(year)) {
      where.year = year;
    }

    if (search) {
      where.title = { contains: search };
    }

    return prisma.exam_sets.findMany({
      where,
      orderBy: { created_at: "desc" },
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
  }

  /**
   * Lấy danh sách đề thi công khai cho User (kèm trạng thái hoàn thành và điểm cao nhất)
   */
  static async getPublicExams(userId: number | null) {
    const exams = await prisma.exam_sets.findMany({
      where: {
        status: "PUBLISHED",
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        duration_minutes: true,
        total_questions: true,
      },
    });

    if (userId === null) return exams;

    const sessions = await prisma.test_sessions.findMany({
      where: {
        user_id: userId,
        status: "COMPLETED",
        exam_set_id: { in: exams.map((e) => e.id) },
      },
      select: {
        id: true,
        exam_set_id: true,
        total_score: true,
        submitted_at: true,
      },
      orderBy: { submitted_at: "desc" },
    });

    // Bản đồ điểm cao nhất và bộ session gần nhất
    const bestSessionMap = new Map<number, any>();
    const latestSessionMap = new Map<number, any>();

    for (const s of sessions) {
      if (!latestSessionMap.has(s.exam_set_id)) latestSessionMap.set(s.exam_set_id, s);

      const existing = bestSessionMap.get(s.exam_set_id);
      if (!existing || (s.total_score ?? 0) > (existing.total_score ?? 0)) {
        bestSessionMap.set(s.exam_set_id, s);
      }
    }

    return exams.map((exam) => {
      const best = bestSessionMap.get(exam.id);
      const latest = latestSessionMap.get(exam.id);
      return {
        ...exam,
        completed: !!best,
        best_score: best?.total_score ?? null,
        latest_session_id: latest?.id ?? null,
      };
    });
  }

  /**
   * Lấy danh sách câu hỏi cơ bản của một đề thi
   */
  static async getExamQuestions(examSetId: number) {
    const exam = await prisma.exam_sets.findUnique({
      where: { id: examSetId },
      select: {
        id: true,
        title: true,
        year: true,
        status: true,
        questions: {
          orderBy: { question_number: "asc" },
          select: {
            id: true,
            question_number: true,
            part_number: true,
          },
        },
      },
    });

    if (!exam) throw new Error("Không tìm thấy đề thi.");
    return exam;
  }

  /**
   * Lấy danh sách câu hỏi đã ẩn đáp án đúng (dành cho User đi thi)
   */
  static async getSanitizedExamQuestions(examSetId: number) {
    const exam = await prisma.exam_sets.findUnique({
      where: { id: examSetId, status: "PUBLISHED" },
      select: { id: true },
    });

    if (!exam) throw new Error("Không tìm thấy đề thi hoặc đề chưa công khai.");

    const questions = await prisma.questions.findMany({
      where: { exam_set_id: examSetId },
      include: {
        answers: {
          select: { id: true, option_label: true, content: true }
        },
        group: true,
      },
      orderBy: { question_number: "asc" },
    });

    // Gom nhóm URL ảnh
    const groupImageUrlMap = new Map<number, string[]>();
    questions.forEach(q => {
      if (q.group_id) {
        const urls = [
          ...splitPipeSeparatedValues(q.image_url),
          ...splitPipeSeparatedValues(q.group?.image_url)
        ];
        const existing = groupImageUrlMap.get(q.group_id) || [];
        groupImageUrlMap.set(q.group_id, Array.from(new Set([...existing, ...urls])));
      }
    });

    return questions.map(q => {
      const { correct_answer, explanation, ...rest } = q;
      const media = getQuestionMedia(q as any, groupImageUrlMap);
      return {
        ...rest,
        image_url: media.image_url,
        image_urls: media.image_urls,
        audio_url: media.audio_url,
        transcript: media.transcript,
        passage_text: media.passage_text,
      };
    });
  }

  /**
   * Lấy chi tiết một câu hỏi (bao gồm đáp án và nhóm câu hỏi)
   */
  static async getQuestionDetail(examSetId: number, questionNumber: number) {
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
          orderBy: { option_label: "asc" },
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

    if (!question) throw new Error("Không tìm thấy câu hỏi.");

    // Chuẩn hóa dữ liệu media (kế thừa từ Group nếu câu hỏi không có)
    const resolvedImageUrl = mergePipeSeparatedValues(
      question.group?.image_url ?? null,
      question.image_url,
    );
    const resolvedAudioUrl = question.audio_url ?? question.group?.audio_url ?? null;
    const resolvedTranscript = question.transcript ?? question.group?.transcript ?? null;

    return {
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
  }

  /**
   * Tạo đề thi nháp (thủ công)
   */
  static async createManualExam(data: { title: string; year?: number; type?: string }) {
    if (!data.title) throw new Error("Tên đề thi là bắt buộc.");

    return prisma.exam_sets.create({
      data: {
        title: data.title,
        year: data.year,
        type: data.type || "TOEIC",
        status: "DRAFT",
      },
    });
  }

  /**
   * Cập nhật trạng thái đề thi (Draft, Published, Hidden)
   */
  static async updateExamStatus(examId: number, status: string) {
    if (!VALID_EXAM_STATUSES.includes(status as any)) {
      throw new Error("Trạng thái không hợp lệ.");
    }

    return prisma.exam_sets.update({
      where: { id: examId },
      data: { 
        status: status as any,
        deleted_at: null, // Reset deleted_at when status is updated
      },
    });
  }

  /**
   * Xử lý Import đề thi từ Excel
   */
  static async importExamFromExcel(buffer: Buffer, examData: { title: string; year: number; type?: string; createdBy?: number }) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0] ?? workbook.getWorksheet(1);
    if (!worksheet) throw new Error("Không đọc được sheet đầu tiên trong file Excel.");

    // Ánh xạ Headers
    const headerRow = worksheet.getRow(1);
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const val = normalizeCellValue(cell.value);
      if (typeof val === "string") headerMap[val] = colNumber;
    });

    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headerMap[h]);
    if (missingHeaders.length > 0) {
      throw new Error(`File Excel thiếu các cột bắt buộc: ${missingHeaders.join(", ")}`);
    }

    const getVal = (row: ExcelJS.Row, name: string) => {
      const col = headerMap[name];
      return col ? normalizeCellValue(row.getCell(col).value) : null;
    };

    return prisma.$transaction(async (tx) => {
      // 1. Tạo Exam Set
      const exam = await tx.exam_sets.create({
        data: {
          title: examData.title.trim(),
          year: examData.year,
          type: examData.type || "TOEIC",
          created_by: examData.createdBy,
          status: "DRAFT",
        },
      });

      const createdGroups: Record<string, number> = {};
      let questionCount = 0;

      // 2. Lặp qua các dòng dữ liệu (từ dòng 2)
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const qNum = parseIntegerField(getVal(row, "Question_No"));
        if (!qNum) break;

        const partNum = parseIntegerField(getVal(row, "Part"), 0) ?? 0;
        const groupRef = getVal(row, "Group_Ref")?.toString() || null;

        // Validate URLs
        const gImg = getVal(row, "Group_Image_URL")?.toString() || null;
        const gAud = getVal(row, "Group_Audio_URL")?.toString() || null;
        const qImg = getVal(row, "Question_Image_URL")?.toString() || null;
        const qAud = getVal(row, "Question_Audio_URL")?.toString() || null;

        if (!isHttpUrl(gImg) || !isHttpUrl(gAud) || !isHttpUrl(qImg) || !isHttpUrl(qAud)) {
          throw new Error(`Dòng ${i}: Tồn tại URL media không hợp lệ (phải là HTTP/HTTPS).`);
        }

        // Xử lý Question Groups
        let groupId: number | undefined;
        if (groupRef) {
          if (!createdGroups[groupRef]) {
            const group = await tx.question_groups.create({
              data: {
                exam_set_id: exam.id,
                part_number: partNum,
                passage_text: getVal(row, "Group_Text")?.toString() || null,
                transcript: getVal(row, "Group_Transcript")?.toString() || null,
                image_url: gImg,
                audio_url: gAud,
              },
            });
            createdGroups[groupRef] = group.id;
          }
          groupId = createdGroups[groupRef];
        }

        const correct = getVal(row, "Correct");
        if (!correct) throw new Error(`Dòng ${i}: Thiếu đáp án đúng.`);

        // Tạo Question
        const question = await tx.questions.create({
          data: {
            exam_set_id: exam.id,
            group_id: groupId,
            part_number: partNum,
            question_number: qNum,
            content: getVal(row, "Question_Text")?.toString() || null,
            transcript: getVal(row, "Question_Transcript")?.toString() || null,
            image_url: qImg,
            audio_url: qAud,
            correct_answer: String(correct).trim(),
            explanation: getVal(row, "Explanation")?.toString() || null,
          },
        });

        // Tạo Answer Options
        const options = [
          { label: "A", val: getVal(row, "Opt_A") },
          { label: "B", val: getVal(row, "Opt_B") },
          { label: "C", val: getVal(row, "Opt_C") },
          { label: "D", val: getVal(row, "Opt_D") },
        ].filter(o => o.val !== null);

        if (options.length > 0) {
          await tx.answer_options.createMany({
            data: options.map(o => ({
              question_id: question.id,
              option_label: o.label,
              content: String(o.val).trim(),
            })),
          });
        }

        questionCount++;
      }

      if (questionCount !== 200) {
        throw new Error(`Số câu hỏi bóc tách được (${questionCount}) không đủ 200 câu cho đề TOEIC.`);
      }

      return exam;
    });
  }

  /**
   * Xóa mềm đề thi
   */
  static async softDeleteExam(examId: number) {
    return prisma.exam_sets.update({
      where: { id: examId },
      data: {
        status: "DELETED",
        deleted_at: new Date(),
      },
    });
  }

  /**
   * Khôi phục đề thi
   */
  static async restoreExam(examId: number) {
    return prisma.exam_sets.update({
      where: { id: examId },
      data: {
        status: "HIDDEN",
        deleted_at: null,
      },
    });
  }

  /**
   * Cập nhật thông tin cơ bản đề thi
   */
  static async updateExam(examId: number, data: { title?: string; year?: number; type?: string }) {
    return prisma.exam_sets.update({
      where: { id: examId },
      data: {
        title: data.title?.trim(),
        year: data.year,
        type: data.type,
      },
    });
  }

  /**
   * Thêm câu hỏi thủ công
   */
  static async createQuestion(examSetId: number, data: any) {
    return prisma.$transaction(async (tx) => {
      const question = await tx.questions.create({
        data: {
          exam_set_id: examSetId,
          part_number: data.part_number,
          question_number: data.question_number,
          content: data.content,
          correct_answer: data.correct_answer,
          image_url: data.image_url,
          audio_url: data.audio_url,
          transcript: data.transcript,
          explanation: data.explanation,
        },
      });

      if (Array.isArray(data.answers)) {
        await tx.answer_options.createMany({
          data: data.answers.map((a: any) => ({
            question_id: question.id,
            option_label: a.option_label,
            content: a.content,
          })),
        });
      }

      return question;
    });
  }

  /**
   * Cập nhật chi tiết câu hỏi
   */
  static async updateQuestionDetail(examSetId: number, questionNumber: number, data: any) {
    const question = await prisma.questions.findFirst({
      where: { exam_set_id: examSetId, question_number: questionNumber },
    });

    if (!question) throw new Error("Không tìm thấy câu hỏi.");

    return prisma.$transaction(async (tx) => {
      await tx.questions.update({
        where: { id: question.id },
        data: {
          part_number: data.part_number,
          content: data.content,
          correct_answer: data.correct_answer,
          image_url: data.image_url,
          audio_url: data.audio_url,
          transcript: data.transcript,
          explanation: data.explanation,
        },
      });

      if (Array.isArray(data.answers)) {
        for (const a of data.answers) {
          await tx.answer_options.upsert({
            where: {
              question_id_option_label: {
                question_id: question.id,
                option_label: a.option_label,
              },
            },
            update: { content: a.content },
            create: {
              question_id: question.id,
              option_label: a.option_label,
              content: a.content,
            },
          });
        }
      }
    });
  }
}
