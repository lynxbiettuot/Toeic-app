import { prisma } from "../lib/prisma.js";
import {
  getQuestionMedia,
  collectQuestionImageUrls
} from "../utils/media.utils.js";
import {
  calculateToeicScore,
  isReadingQuestion
} from "../utils/scoring.utils.js";
import {
  generateReadingExplanation,
  isGeminiConfigured
} from "./gemini.js";

export class TestSessionService {
  /**
   * Khởi tạo một phiên làm bài mới
   */
  static async startSession(userId: number, examId: number) {
    const [exam, questionCount] = await Promise.all([
      prisma.exam_sets.findUnique({
        where: { id: examId },
        select: { id: true, status: true },
      }),
      prisma.questions.count({ where: { exam_set_id: examId } }),
    ]);

    if (!exam || exam.status !== "PUBLISHED") {
      throw new Error("Không tìm thấy đề thi hoặc đề chưa được công khai.");
    }

    if (questionCount === 0) {
      throw new Error("Đề thi này chưa có câu hỏi.");
    }

    return prisma.test_sessions.create({
      data: {
        user_id: userId,
        exam_set_id: exam.id,
        started_at: new Date(),
        status: "IN_PROGRESS",
      },
    });
  }

  /**
   * Nộp bài thi, tính điểm và lưu kết quả
   */
  static async submitAnswers(sessionId: number, examId: number, userId: number, answers: any[], isPractice: boolean = false) {
    const session = await prisma.test_sessions.findFirst({
      where: { id: sessionId, exam_set_id: examId, user_id: userId },
    });

    if (!session) throw new Error("Không tìm thấy phiên làm bài.");

    const questions = await prisma.questions.findMany({
      where: { exam_set_id: examId },
      select: { id: true, correct_answer: true, part_number: true },
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));
    let readingCorrect = 0;
    let listeningCorrect = 0;
    const userAnswersToSave = [];

    for (const ans of answers) {
      const q = questionMap.get(ans.question_id);
      if (q) {
        const isCorrect = q.correct_answer === ans.selected_option;
        userAnswersToSave.push({
          session_id: sessionId,
          question_id: q.id,
          selected_option: ans.selected_option,
          is_correct: isCorrect,
          answered_at: new Date(),
        });

        if (isCorrect) {
          if (q.part_number <= 4) listeningCorrect++;
          else readingCorrect++;
        }
      }
    }

    const scores = calculateToeicScore(readingCorrect, listeningCorrect);

    return prisma.$transaction(async (tx) => {
      if (userAnswersToSave.length > 0) {
        await tx.user_answers.createMany({ data: userAnswersToSave });
      }

      return tx.test_sessions.update({
        where: { id: sessionId },
        data: {
          submitted_at: new Date(),
          status: isPractice ? "PRACTICE_COMPLETED" : "COMPLETED",
          listening_score: scores.listening_score,
          reading_score: scores.reading_score,
          total_score: scores.total_score,
        },
      });
    });
  }

  /**
   * Lấy dữ liệu phiên làm bài (Hàm helper nội bộ)
   */
  private static async loadSessionData(examId: number, sessionId: number, userId: number) {
    const [exam, session] = await Promise.all([
      prisma.exam_sets.findFirst({
        where: { id: examId, status: "PUBLISHED" },
      }),
      prisma.test_sessions.findFirst({
        where: { id: sessionId, exam_set_id: examId, user_id: userId },
      }),
    ]);

    if (!exam || !session) return null;

    const userAnswers = await prisma.user_answers.findMany({
      where: { session_id: sessionId },
    });

    const userAnswerMap = new Map(userAnswers.map(ua => [ua.question_id, ua]));
    const questions = await prisma.questions.findMany({
      where: {
        exam_set_id: examId,
        ...(session.status === "PRACTICE_COMPLETED" ? { id: { in: userAnswers.map(ua => ua.question_id) } } : {})
      },
      include: {
        answers: true,
        group: true
      },
      orderBy: { question_number: "asc" }
    });

    return { exam, session, questions, userAnswerMap };
  }

  /**
   * Lấy thống kê tổng quát của bài thi
   */
  static async getSessionSummary(examId: number, sessionId: number, userId: number) {
    const data = await this.loadSessionData(examId, sessionId, userId);
    if (!data) throw new Error("Không tìm thấy dữ liệu phiên làm bài.");

    const correctCount = data.questions.filter(q => data.userAnswerMap.get(q.id)?.is_correct).length;

    // Thống kê theo Part
    const partBuckets = new Map<number, any>();
    data.questions.forEach(q => {
      const current = partBuckets.get(q.part_number) || { correct_count: 0, total: 0 };
      current.total++;
      if (data.userAnswerMap.get(q.id)?.is_correct) current.correct_count++;
      partBuckets.set(q.part_number, current);
    });

    const partStats = Array.from(partBuckets.entries()).sort((a, b) => a[0] - b[0]).map(([part, stat]) => ({
      part_number: part,
      title: `Part ${part}`,
      correct_count: stat.correct_count,
      total_questions: stat.total,
      wrong_count: stat.total - stat.correct_count,
    }));

    return {
      exam: data.exam,
      session: data.session,
      total_questions: data.questions.length,
      correct_count: correctCount,
      part_stats: partStats,
    };
  }

  /**
   * Lấy chi tiết một câu hỏi trong phiên (kèm giải thích AI nếu cần)
   */
  static async getQuestionDetail(examId: number, sessionId: number, questionId: number, userId: number) {
    const data = await this.loadSessionData(examId, sessionId, userId);
    if (!data) throw new Error("Không tìm thấy dữ liệu phiên làm bài.");

    const question = data.questions.find(q => q.id === questionId);
    if (!question) throw new Error("Không tìm thấy câu hỏi.");

    const userAnswer = data.userAnswerMap.get(question.id);
    const media = getQuestionMedia(question as any);

    let aiExplanation = question.explanation;

    // Nếu câu hỏi chưa có giải thích và là Reading, gọi Gemini
    if (data.session.status === "COMPLETED" && !aiExplanation && isGeminiConfigured && isReadingQuestion(question)) {
      try {
        const correctOpt = question.answers.find(a => a.option_label === question.correct_answer);
        const selectedOpt = question.answers.find(a => a.option_label === userAnswer?.selected_option);

        aiExplanation = await generateReadingExplanation({
          questionNumber: question.question_number,
          partNumber: question.part_number,
          questionText: question.content,
          passageText: media.passage_text,
          transcript: media.transcript,
          imageUrls: media.image_urls,
          options: question.answers.map(a => ({ option_label: a.option_label, content: a.content })),
          correctAnswerLabel: question.correct_answer,
          correctAnswerText: correctOpt?.content || null,
          selectedAnswerLabel: userAnswer?.selected_option || null,
          selectedAnswerText: selectedOpt?.content || null,
        });

        if (aiExplanation) {
          await prisma.questions.update({
            where: { id: question.id },
            data: { explanation: aiExplanation }
          });
        }
      } catch (e) {
        console.error("Gemini Error:", e);
      }
    }

    return {
      exam: data.exam,
      session: data.session,
      question: {
        ...question,
        explanation: aiExplanation,
        media
      },
      userAnswer
    };
  }

  /**
   * Lấy danh sách câu hỏi của một Part cụ thể trong phiên làm bài
   */
  static async getTestSessionPartQuestions(examId: number, sessionId: number, partNumber: number, userId: number) {
    const data = await this.loadSessionData(examId, sessionId, userId);
    if (!data) throw new Error("Không tìm thấy dữ liệu phiên làm bài.");

    const questions = data.questions
      .filter(q => q.part_number === partNumber)
      .map(q => {
        const media = getQuestionMedia(q as any);
        const userAnswer = data.userAnswerMap.get(q.id);
        return {
          ...q,
          image_url: media.image_url,
          image_urls: media.image_urls,
          audio_url: media.audio_url,
          transcript: media.transcript,
          passage_text: media.passage_text,
          is_correct: userAnswer?.is_correct ?? null,
          selected_option: userAnswer?.selected_option ?? null,
          answers: q.answers.map(a => ({
            ...a,
            is_selected: a.option_label === userAnswer?.selected_option,
            is_correct: a.option_label === q.correct_answer
          }))
        };
      });

    return {
      exam: data.exam,
      session: data.session,
      part_number: partNumber,
      questions
    };
  }

  /**
   * Lấy lịch sử các câu trả lời sai của người dùng, nhóm theo đề thi
   */
  static async getWrongAnswerHistory(userId: number) {
    const allUserAnswers = await prisma.user_answers.findMany({
      where: { session: { user_id: userId } },
      include: {
        question: {
          include: { exam_set: true }
        }
      },
      orderBy: { answered_at: "desc" },
    });

    if (allUserAnswers.length === 0) return [];

    // Tìm trạng thái mới nhất cho từng câu hỏi
    const latestStatusMap = new Map<number, any>();
    for (const ua of allUserAnswers) {
      if (!latestStatusMap.has(ua.question_id)) {
        latestStatusMap.set(ua.question_id, ua);
      }
    }

    // Lọc ra các câu mà trạng thái mới nhất vẫn là SAI
    const currentWrong = Array.from(latestStatusMap.values()).filter(ua => !ua.is_correct);
    if (currentWrong.length === 0) return [];

    // Nhóm theo Exam Set
    const examMap = new Map<number, any>();
    for (const ua of currentWrong) {
      const exam = ua.question.exam_set;
      if (!exam) continue;

      const existing = examMap.get(exam.id) || {
        exam_id: exam.id,
        exam_title: exam.title,
        exam_year: exam.year,
        wrong_count: 0,
        wrong_questions: [],
        submitted_at: ua.answered_at,
        session_id: ua.session_id
      };

      existing.wrong_count++;
      existing.wrong_questions.push({
        question_id: ua.question_id,
        question_number: ua.question.question_number,
        part_number: ua.question.part_number,
        content: ua.question.content,
        selected_option: ua.selected_option,
      });

      examMap.set(exam.id, existing);
    }

    return Array.from(examMap.values()).sort((a, b) => b.submitted_at.getTime() - a.submitted_at.getTime());
  }
}
