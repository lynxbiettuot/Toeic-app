import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export const getPublicExams = async (_req: Request, res: Response) => {
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
        duration_minutes: true,
        total_questions: true,
      },
    });

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
      },
    });

    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy đề thi.", statusCode: 404 });
    }

    return res.status(200).json({
      message: "Lấy chi tiết đề thi thành công.",
      statusCode: 200,
      data: exam,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết đề thi:", error);
    return res.status(500).json({ message: "Lỗi server.", statusCode: 500 });
  }
};

export const getExamQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Fetch all questions and question groups associated with the exam
    const questions = await prisma.questions.findMany({
      where: { exam_set_id: parseInt(String(id), 10) },
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
    
    // Exclude the correct_answer to prevent cheating on frontend
    const sanitizedQuestions = questions.map(q => {
      const { correct_answer, explanation, ...rest } = q;
      return rest;
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
    
    // In a real application, user_id should be extracted from auth middleware (req.user.id).
    // For now, assuming a mock user with ID 1 if not provided, or provided in body.
    const userId = req.body.userId || 1; 

    const session = await prisma.test_sessions.create({
      data: {
        user_id: userId,
        exam_set_id: examId,
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
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Dữ liệu trả lời không hợp lệ." });
    }

    // Lấy tất cả câu hỏi và đáp án đúng để tính điểm
    const questions = await prisma.questions.findMany({
      where: { exam_set_id: parseInt(String(id), 10) },
      select: { id: true, correct_answer: true, part_number: true },
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));
    
    const userAnswersToSave = [];
    let readingScore = 0; // Simplified scoring: just counting correct answers for now (Part 5,6,7)
    let listeningScore = 0; // Simplified scoring: (Part 1,2,3,4)
    
    for (const ans of answers) {
      const q = questionMap.get(ans.question_id);
      if (q) {
        const isCorrect = q.correct_answer === ans.selected_option;
        userAnswersToSave.push({
          session_id: parseInt(String(sessionId), 10),
          question_id: q.id,
          selected_option: ans.selected_option,
          is_correct: isCorrect,
          answered_at: new Date(),
        });
        
        if (isCorrect) {
          if (q.part_number <= 4) {
             listeningScore += 5; // Fake 5 points per question for simplicity
          } else {
             readingScore += 5;
          }
        }
      }
    }

    // Tính tổng số điểm
    const totalScore = listeningScore + readingScore;

    // Lưu User Answers
    if (userAnswersToSave.length > 0) {
      await prisma.user_answers.createMany({
        data: userAnswersToSave,
      });
    }

    // Cập nhật Test Session
    const updatedSession = await prisma.test_sessions.update({
      where: { id: parseInt(String(sessionId), 10) },
      data: {
        submitted_at: new Date(),
        status: "COMPLETED",
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
