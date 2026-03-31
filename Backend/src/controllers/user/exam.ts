import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { generateReadingExplanation, isGeminiConfigured } from "../../services/gemini.js";

type SessionQuestionAnswer = {
  id: number;
  option_label: string;
  content: string;
};

type SessionQuestionRecord = {
  id: number;
  exam_set_id: number;
  part_number: number;
  question_number: number;
  content: string | null;
  transcript: string | null;
  image_url: string | null;
  audio_url: string | null;
  correct_answer: string;
  explanation: string | null;
  group_id: number | null;
  answers: SessionQuestionAnswer[];
  image_urls?: string[];
  group?: {
    id: number;
    part_number: number;
    passage_text: string | null;
    transcript: string | null;
    image_url: string | null;
    audio_url: string | null;
  } | null;
};

type UserAnswerRecord = {
  question_id: number;
  selected_option: string | null;
  is_correct: boolean | null;
  answered_at: Date | null;
  ai_explanation: string | null;
};

const parseIntParam = (value: unknown) => {
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
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

const collectQuestionImageUrls = (
  question: Pick<SessionQuestionRecord, "image_url" | "group">,
) => {
  const collected = [
    ...splitPipeSeparatedValues(question.image_url),
    ...splitPipeSeparatedValues(question.group?.image_url),
  ];

  return Array.from(new Set(collected));
};

const buildQuestionImageUrlMap = (questions: SessionQuestionRecord[]) => {
  const groupImageUrlMap = new Map<number, string[]>();

  for (const question of questions) {
    if (!question.group_id) {
      continue;
    }

    const currentUrls = collectQuestionImageUrls(question);
    if (currentUrls.length === 0) {
      continue;
    }

    const existingUrls = groupImageUrlMap.get(question.group_id) ?? [];
    groupImageUrlMap.set(question.group_id, Array.from(new Set([...existingUrls, ...currentUrls])));
  }

  return groupImageUrlMap;
};

const getQuestionMedia = (
  question: SessionQuestionRecord,
  groupImageUrlMap?: Map<number, string[]>,
) => {
  const groupedUrls = question.group_id ? groupImageUrlMap?.get(question.group_id) ?? [] : [];
  const directUrls = collectQuestionImageUrls(question);
  const imageUrls = Array.from(new Set([...groupedUrls, ...directUrls]));

  return {
    image_urls: imageUrls,
    image_url: imageUrls.join(" | ") || null,
    audio_url: question.audio_url ?? question.group?.audio_url ?? null,
    transcript: question.transcript ?? question.group?.transcript ?? null,
    passage_text: question.group?.passage_text ?? null,
  };
};

const buildAnswerView = (
  answer: SessionQuestionAnswer,
  correctAnswer: string,
  selectedOption: string | null,
) => ({
  id: answer.id,
  option_label: answer.option_label,
  content: answer.content,
  is_correct: answer.option_label === correctAnswer,
  is_selected: selectedOption === answer.option_label,
});

const buildQuestionView = (
  question: SessionQuestionRecord,
  groupImageUrlMap: Map<number, string[]>,
  userAnswer?: UserAnswerRecord | null,
) => {
  const media = getQuestionMedia(question, groupImageUrlMap);
  const selectedOption = userAnswer?.selected_option ?? null;
  const isCorrect = userAnswer?.is_correct ?? null;

  return {
    id: question.id,
    exam_set_id: question.exam_set_id,
    part_number: question.part_number,
    question_number: question.question_number,
    content: question.content,
    explanation: question.explanation,
    correct_answer: question.correct_answer,
    selected_option: selectedOption,
    is_correct: isCorrect,
    answered_at: userAnswer?.answered_at ?? null,
    ai_explanation: userAnswer?.ai_explanation ?? question.explanation ?? null,
    image_url: media.image_url,
    image_urls: media.image_urls,
    audio_url: media.audio_url,
    transcript: media.transcript,
    passage_text: media.passage_text,
    answers: question.answers.map((answer) =>
      buildAnswerView(answer, question.correct_answer, selectedOption),
    ),
  };
};

const normalizeAnswerLabel = (value: unknown) => String(value ?? "").trim().toUpperCase();

const isReadingQuestion = (question: Pick<SessionQuestionRecord, "question_number" | "part_number">) =>
  (question.question_number >= 101 && question.question_number <= 200) || question.part_number >= 5;

const calculateReadingScore = (correctCount: number) =>
  correctCount === 0 ? 5 : correctCount * 5 - 5;

const calculateListeningScore = (correctCount: number) => {
  if (correctCount === 0) {
    return 5;
  }

  if (correctCount <= 75) {
    return correctCount * 5 + 10;
  }

  if (correctCount <= 96) {
    return correctCount * 5 + 15;
  }

  return 495;
};

const loadSessionData = async (examId: number, sessionId: number, userId?: number) => {
  const [exam, session] = await Promise.all([
    prisma.exam_sets.findFirst({
      where: { id: examId, deleted_at: null, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        total_questions: true,
        duration_minutes: true,
      },
    }),
    prisma.test_sessions.findFirst({
      where: {
        id: sessionId,
        exam_set_id: examId,
        ...(userId ? { user_id: userId } : {}),
      },
      select: {
        id: true,
        user_id: true,
        exam_set_id: true,
        started_at: true,
        submitted_at: true,
        listening_score: true,
        reading_score: true,
        total_score: true,
        status: true,
      },
    }),
  ]);

  if (!exam || !session) {
    return { exam: null, session: null };
  }

  // Lấy các câu trả lời của user trong session này
  const userAnswers = await prisma.user_answers.findMany({
    where: {
      session_id: sessionId,
    },
    select: {
      question_id: true,
      selected_option: true,
      is_correct: true,
      answered_at: true,
      ai_explanation: true,
    },
  });

  const userAnswerMap = new Map(userAnswers.map((item) => [item.question_id, item]));
  const sessionQuestionIds = userAnswers.map((ua) => ua.question_id);

  // Lấy danh sách câu hỏi
  const questions = await prisma.questions.findMany({
    where: {
      exam_set_id: examId,
      // Nếu là phiên luyện tập, chỉ lấy những câu đã làm trong phiên đó
      ...(session.status === "PRACTICE_COMPLETED" ? { id: { in: sessionQuestionIds } } : {}),
    },
    include: {
      answers: {
        select: {
          id: true,
          option_label: true,
          content: true,
        },
      },
      group: {
        select: {
          id: true,
          part_number: true,
          passage_text: true,
          transcript: true,
          image_url: true,
          audio_url: true,
        },
      },
    },
    orderBy: { question_number: "asc" },
  });

  return {
    exam,
    session,
    questions: questions as SessionQuestionRecord[],
    userAnswerMap,
  };
};

export const getPublicExams = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.query.userId);

    const exams = await prisma.exam_sets.findMany({
      where: {
        deleted_at: null,
        status: "PUBLISHED",
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        duration_minutes: true,
        total_questions: true,
      },
    });

    // If userId provided, fetch best completed session per exam
    if (userId !== null) {
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
          listening_score: true,
          reading_score: true,
          submitted_at: true,
        },
        orderBy: { submitted_at: "desc" },
      });

      // Build a map: exam_set_id -> best session (highest score)
      const bestSessionMap = new Map<number, typeof sessions[0]>();
      for (const session of sessions) {
        const existing = bestSessionMap.get(session.exam_set_id);
        if (!existing || (session.total_score ?? 0) > (existing.total_score ?? 0)) {
          bestSessionMap.set(session.exam_set_id, session);
        }
      }

      // Latest completed session per exam (for navigation)
      const latestSessionMap = new Map<number, typeof sessions[0]>();
      for (const session of sessions) {
        if (!latestSessionMap.has(session.exam_set_id)) {
          latestSessionMap.set(session.exam_set_id, session);
        }
      }

      const examsWithStatus = exams.map((exam) => {
        const bestSession = bestSessionMap.get(exam.id);
        const latestSession = latestSessionMap.get(exam.id);
        return {
          ...exam,
          completed: !!bestSession,
          best_score: bestSession?.total_score ?? null,
          latest_session_id: latestSession?.id ?? null,
        };
      });

      return res.status(200).json({
        message: "Lấy danh sách đề thi thành công.",
        statusCode: 200,
        data: examsWithStatus,
      });
    }

    return res.status(200).json({
      message: "Lấy danh sách đề thi thành công.",
      statusCode: 200,
      data: exams,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đề cho user:", error);
    return res.status(500).json({
      message: "Không thể lấy danh sách đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getExamDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam_sets.findUnique({
      where: { id: parseInt(String(id), 10) },
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        audio_url: true,
        thumbnail_url: true,
        duration_minutes: true,
        total_questions: true,
        status: true,
      },
    });

    if (!exam || exam.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Không tìm thấy đề thi.", statusCode: 404 });
    }

    const { status, ...data } = exam;
    return res.status(200).json({
      message: "Lấy chi tiết đề thi thành công.",
      statusCode: 200,
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết đề thi:", error);
    return res.status(500).json({ message: "Lỗi server.", statusCode: 500 });
  }
};

export const getExamQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const examId = parseInt(String(id), 10);
    
    // First check if exam exists and is published
    const exam = await prisma.exam_sets.findUnique({
      where: { id: examId },
      select: { status: true },
    });

    if (!exam || exam.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Không tìm thấy đề thi.", statusCode: 404 });
    }
    
    // Fetch all questions and question groups associated with the exam
    const questions = await prisma.questions.findMany({
      where: { exam_set_id: examId },
      include: {
        answers: {
          select: {
            id: true,
            option_label: true,
            content: true,
          }
        },
        group: true,
      },
      orderBy: { question_number: 'asc' },
    });
    const groupImageUrlMap = buildQuestionImageUrlMap(questions as SessionQuestionRecord[]);
    
    // Exclude the correct_answer to prevent cheating on frontend
    const sanitizedQuestions = questions.map(q => {
      const { correct_answer, explanation, ...rest } = q;
      const media = getQuestionMedia(q as SessionQuestionRecord, groupImageUrlMap);
      return {
        ...rest,
        image_url: media.image_url,
        image_urls: media.image_urls,
      };
    });

    return res.status(200).json({
      message: "Lấy câu hỏi thành công.",
      statusCode: 200,
      data: { questions: sanitizedQuestions },
    });
  } catch (error) {
    console.error("Lỗi lấy câu hỏi đề thi:", error);
    return res.status(500).json({ message: "Lỗi server.", statusCode: 500 });
  }
};

export const startTestSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const examId = parseInt(String(id), 10);
    if (Number.isNaN(examId)) {
      return res.status(400).json({ message: "examId không hợp lệ.", statusCode: 400 });
    }
    
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized.", statusCode: 401 });
    }

    const [exam, questionCount] = await Promise.all([
      prisma.exam_sets.findUnique({
        where: { id: examId },
        select: { id: true, title: true, status: true },
      }),
      prisma.questions.count({ where: { exam_set_id: examId } }),
    ]);

    if (!exam || exam.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Không tìm thấy đề thi.", statusCode: 404 });
    }

    if (questionCount === 0) {
      return res.status(400).json({
        message: "Đề thi này chưa có câu hỏi. Vui lòng chọn đề khác.",
        statusCode: 400,
      });
    }

    const session = await prisma.test_sessions.create({
      data: {
        user_id: userId,
        exam_set_id: exam.id,
        started_at: new Date(),
        status: "IN_PROGRESS",
      },
    });

    return res.status(201).json({
      message: "Bắt đầu làm bài thành công.",
      statusCode: 201,
      data: { sessionId: session.id },
    });
  } catch (error) {
    console.error("Lỗi bắt đầu phiên làm bài:", error);
    return res.status(500).json({ message: "Lỗi server.", statusCode: 500 });
  }
};

export const submitTestSession = async (req: Request, res: Response) => {
  try {
    const { id, sessionId } = req.params;
    const { answers } = req.body; // Array of { question_id, selected_option }
    const examId = parseInt(String(id), 10);
    const parsedSessionId = parseInt(String(sessionId), 10);
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized.", statusCode: 401 });
    }
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Dữ liệu trả lời không hợp lệ." });
    }

    // Lấy tất cả câu hỏi và đáp án đúng để tính điểm
    const session = await prisma.test_sessions.findFirst({
      where: {
        id: parsedSessionId,
        exam_set_id: examId,
        user_id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm bài.",
        statusCode: 404,
      });
    }

    const questions = await prisma.questions.findMany({
      where: { exam_set_id: examId },
      select: { id: true, correct_answer: true, part_number: true },
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));
    
    const userAnswersToSave = [];
    let readingCorrectCount = 0;
    let listeningCorrectCount = 0;
    
    for (const ans of answers) {
      const q = questionMap.get(ans.question_id);
      if (q) {
        const isCorrect = q.correct_answer === ans.selected_option;
        userAnswersToSave.push({
          session_id: parsedSessionId,
          question_id: q.id,
          selected_option: ans.selected_option,
          is_correct: isCorrect,
          answered_at: new Date(),
        });
        
        if (isCorrect) {
          if (q.part_number <= 4) {
             listeningCorrectCount += 1;
          } else {
             readingCorrectCount += 1;
          }
        }
      }
    }

    // Tính tổng số điểm
    const readingScore = calculateReadingScore(readingCorrectCount);
    const listeningScore = calculateListeningScore(listeningCorrectCount);
    const totalScore = listeningScore + readingScore;

    // Lưu User Answers
    if (userAnswersToSave.length > 0) {
      await prisma.user_answers.createMany({
        data: userAnswersToSave,
      });
    }

    // Cập nhật Test Session
    const finalStatus = req.body.isPractice ? "PRACTICE_COMPLETED" : "COMPLETED";
    const updatedSession = await prisma.test_sessions.update({
      where: { id: parsedSessionId },
      data: {
        submitted_at: new Date(),
        status: finalStatus,
        listening_score: listeningScore,
        reading_score: readingScore,
        total_score: totalScore,
      },
    });

    return res.status(200).json({
      message: "Nộp bài thành công.",
      statusCode: 200,
      data: {
        sessionId: updatedSession.id,
        listening_score: listeningScore,
        reading_score: readingScore,
        total_score: totalScore,
      },
    });

  } catch (error) {
    console.error("Lỗi nộp bài:", error);
    return res.status(500).json({ message: "Lỗi server.", statusCode: 500 });
  }
};

export const getTestSessionSummary = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
        statusCode: 401,
      });
    }

    if (examId === null || sessionId === null) {
      return res.status(401).json({
        message: "examId hoặc sessionId không hợp lệ.",
        statusCode: 401,
      });
    }

    const data = await loadSessionData(examId, sessionId, userId);

    if (!data.exam || !data.session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm bài.",
        statusCode: 404,
      });
    }

    const correctCount = data.questions.filter((question) => {
      const userAnswer = data.userAnswerMap.get(question.id);
      return userAnswer?.is_correct === true;
    }).length;

    const totalQuestions = data.questions.length;
    const answeredCount = data.userAnswerMap.size;
    const wrongCount = totalQuestions - correctCount;

    const partBuckets = new Map<number, { correct_count: number; total_questions: number }>();
    for (const question of data.questions) {
      const current = partBuckets.get(question.part_number) ?? {
        correct_count: 0,
        total_questions: 0,
      };
      current.total_questions += 1;
      if (data.userAnswerMap.get(question.id)?.is_correct) {
        current.correct_count += 1;
      }
      partBuckets.set(question.part_number, current);
    }

    const partStats = Array.from(partBuckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([partNumber, stat]) => ({
        part_number: partNumber,
        title: `Part ${partNumber}`,
        correct_count: stat.correct_count,
        total_questions: stat.total_questions,
        wrong_count: stat.total_questions - stat.correct_count,
        answered_count: data.questions.filter(
          (question) => question.part_number === partNumber && data.userAnswerMap.has(question.id),
        ).length,
      }));

    return res.status(200).json({
      message: "Lấy thống kê bài thi thành công.",
      statusCode: 200,
      data: {
        exam: data.exam,
        session: data.session,
        total_questions: totalQuestions,
        answered_count: answeredCount,
        correct_count: correctCount,
        wrong_count: wrongCount,
        part_stats: partStats,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy thống kê bài thi:", error);
    return res.status(500).json({
      message: "Lỗi server.",
      statusCode: 500,
    });
  }
};

export const getTestSessionParts = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
        statusCode: 401,
      });
    }

    if (examId === null || sessionId === null) {
      return res.status(400).json({
        message: "examId hoặc sessionId không hợp lệ.",
        statusCode: 400,
      });
    }

    const data = await loadSessionData(examId, sessionId, userId);

    if (!data.exam || !data.session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm bài.",
        statusCode: 404,
      });
    }

    const partMap = new Map<number, { correct_count: number; total_questions: number; answered_count: number }>();
    for (const question of data.questions) {
      const current = partMap.get(question.part_number) ?? {
        correct_count: 0,
        total_questions: 0,
        answered_count: 0,
      };

      current.total_questions += 1;
      if (data.userAnswerMap.has(question.id)) {
        current.answered_count += 1;
      }

      if (data.userAnswerMap.get(question.id)?.is_correct) {
        current.correct_count += 1;
      }

      partMap.set(question.part_number, current);
    }

    const parts = Array.from(partMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([partNumber, stat]) => ({
        part_number: partNumber,
        title: `Part ${partNumber}`,
        correct_count: stat.correct_count,
        total_questions: stat.total_questions,
        answered_count: stat.answered_count,
        wrong_count: stat.total_questions - stat.correct_count,
      }));

    return res.status(200).json({
      message: "Lấy danh sách part thành công.",
      statusCode: 200,
      data: {
        exam: data.exam,
        session: data.session,
        parts,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy part:", error);
    return res.status(500).json({
      message: "Lỗi server.",
      statusCode: 500,
    });
  }
};

export const getTestSessionPartQuestions = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const partNumber = parseIntParam(req.params.partNumber);
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
        statusCode: 401,
      });
    }

    if (examId === null || sessionId === null || partNumber === null) {
      return res.status(400).json({
        message: "Tham số không hợp lệ.",
        statusCode: 400,
      });
    }

    const data = await loadSessionData(examId, sessionId, userId);

    if (!data.exam || !data.session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm bài.",
        statusCode: 404,
      });
    }

    const groupImageUrlMap = buildQuestionImageUrlMap(data.questions);
    const questions = data.questions
      .filter((question) => question.part_number === partNumber)
      .map((question) => buildQuestionView(question, groupImageUrlMap, data.userAnswerMap.get(question.id)));

    return res.status(200).json({
      message: "Lấy danh sách câu hỏi theo part thành công.",
      statusCode: 200,
      data: {
        exam: data.exam,
        session: data.session,
        part_number: partNumber,
        questions,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy câu hỏi theo part:", error);
    return res.status(500).json({
      message: "Lỗi server.",
      statusCode: 500,
    });
  }
};

export const getTestSessionQuestionDetail = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const questionId = parseIntParam(req.params.questionId);
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
        statusCode: 401,
      });
    }

    if (examId === null || sessionId === null || questionId === null) {
      return res.status(400).json({
        message: "Tham số không hợp lệ.",
        statusCode: 400,
      });
    }

    const data = await loadSessionData(examId, sessionId, userId);

    if (!data.exam || !data.session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm bài.",
        statusCode: 404,
      });
    }

    const question = data.questions.find((item) => item.id === questionId);

    if (!question) {
      return res.status(404).json({
        message: "Không tìm thấy câu hỏi.",
        statusCode: 404,
      });
    }

    const userAnswer = data.userAnswerMap.get(question.id) ?? null;
    const groupImageUrlMap = buildQuestionImageUrlMap(data.questions);
    const media = getQuestionMedia(question, groupImageUrlMap);
    const selectedOptionLabel = normalizeAnswerLabel(userAnswer?.selected_option);
    const selectedAnswer = question.answers.find(
      (answer) => normalizeAnswerLabel(answer.option_label) === selectedOptionLabel,
    ) ?? null;
    const correctAnswer = question.answers.find(
      (answer) => answer.option_label === question.correct_answer,
    ) ?? null;

    let explanation = question.explanation ?? null;

    if (
      data.session.status === "COMPLETED" &&
      !explanation &&
      isGeminiConfigured &&
      isReadingQuestion(question)
    ) {
      try {
        const generatedExplanation = await generateReadingExplanation({
          questionNumber: question.question_number,
          partNumber: question.part_number,
          questionText: question.content,
          passageText: media.passage_text,
          transcript: media.transcript,
          imageUrls: media.image_urls,
          options: question.answers.map((answer) => ({
            option_label: answer.option_label,
            content: answer.content,
          })),
          correctAnswerLabel: question.correct_answer,
          correctAnswerText: correctAnswer?.content ?? null,
          selectedAnswerLabel: selectedOptionLabel || null,
          selectedAnswerText: selectedAnswer?.content ?? null,
        });

        if (generatedExplanation) {
          explanation = generatedExplanation;
          question.explanation = generatedExplanation;

          await prisma.questions.update({
            where: {
              id: question.id,
            },
            data: {
              explanation: generatedExplanation,
            },
          });
        }
      } catch (generationError) {
        console.error("Lỗi sinh giải thích Gemini:", generationError);
      }
    }

    const questionForView = {
      ...question,
      explanation,
    };

    return res.status(200).json({
      message: "Lấy chi tiết câu hỏi thành công.",
      statusCode: 200,
      data: {
        exam: data.exam,
        session: data.session,
        question: buildQuestionView(questionForView, groupImageUrlMap, userAnswer),
        correct_answer_text: correctAnswer?.content ?? null,
        selected_answer_label: selectedOptionLabel || null,
        selected_answer_text: selectedAnswer?.content ?? null,
        ai_explanation: explanation,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết câu hỏi:", error);
    return res.status(500).json({
      message: "Lỗi server.",
      statusCode: 500,
    });
  }
};

export const getWrongAnswerHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;

    if (userId === null) {
      return res.status(401).json({
        message: "Unauthorized.",
        statusCode: 401,
      });
    }

    // Lấy tất cả câu trả lời của user từ trước đến nay (cả đề thi chính và luyện tập)
    const allUserAnswers = await prisma.user_answers.findMany({
      where: {
        session: {
          user_id: userId,
        },
      },
      select: {
        session_id: true,
        question_id: true,
        selected_option: true,
        is_correct: true,
        answered_at: true,
        question: {
          select: {
            id: true,
            exam_set_id: true,
            question_number: true,
            part_number: true,
            content: true,
            exam_set: {
              select: {
                id: true,
                title: true,
                year: true,
              },
            },
          },
        },
      },
      orderBy: { answered_at: "desc" },
    });

    if (allUserAnswers.length === 0) {
      return res.status(200).json({
        message: "Không có lịch sử sai sót.",
        statusCode: 200,
        data: [],
      });
    }

    // Tìm trạng thái mới nhất cho từng câu hỏi
    const latestStatusByQuestion = new Map<number, typeof allUserAnswers[0]>();
    for (const ua of allUserAnswers) {
      if (!latestStatusByQuestion.has(ua.question_id)) {
        latestStatusByQuestion.set(ua.question_id, ua);
      }
    }

    // Lọc ra các câu mà trạng thái mới nhất là "SAI"
    const currentWrongAnswers = Array.from(latestStatusByQuestion.values()).filter(
      (ua) => ua.is_correct === false,
    );

    if (currentWrongAnswers.length === 0) {
      return res.status(200).json({
        message: "Hiện không có câu sai nào cần làm lại.",
        statusCode: 200,
        data: [],
      });
    }

    // Nhóm câu sai theo đề thi (Exam)
    const examMap = new Map<
      number,
      {
        exam_id: number;
        exam_title: string;
        exam_year: number | null;
        session_id: number;
        submitted_at: Date | null;
        wrong_count: number;
        wrong_questions: {
          question_id: number;
          question_number: number;
          part_number: number;
          content: string | null;
          selected_option: string | null;
        }[];
      }
    >();

    for (const ua of currentWrongAnswers) {
      const exam = ua.question.exam_set;
      if (!exam) continue;

      const existing = examMap.get(exam.id) ?? {
        exam_id: exam.id,
        exam_title: exam.title,
        exam_year: exam.year,
        session_id: ua.session_id,
        submitted_at: ua.answered_at,
        wrong_count: 0,
        wrong_questions: [],
      };

      existing.wrong_count += 1;
      existing.wrong_questions.push({
        question_id: ua.question_id,
        question_number: ua.question.question_number,
        part_number: ua.question.part_number,
        content: ua.question.content,
        selected_option: ua.selected_option,
      });

      // Đảm bảo session_id và submitted_at là của lần gần nhất (đã sort desc rồi nên lấy cái đầu tiên gặp là được)
      if (existing.wrong_questions.length === 1) {
        existing.session_id = ua.session_id;
        existing.submitted_at = ua.answered_at;
      }

      examMap.set(exam.id, existing);
    }

    // Sắp xếp lại các đề thi theo thời gian trả lời sai gần nhất
    const result = Array.from(examMap.values()).sort(
      (a, b) => (b.submitted_at?.getTime() ?? 0) - (a.submitted_at?.getTime() ?? 0),
    );

    return res.status(200).json({
      message: "Lấy lịch sử sai sót thành công.",
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    console.error("Lỗi lấy lịch sử sai sót:", error);
    return res.status(500).json({
      message: "Lỗi server.",
      statusCode: 500,
    });
  }
};
