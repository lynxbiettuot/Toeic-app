import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { ExamService } from "../../services/exam.service.js";
import { TestSessionService } from "../../services/test-session.service.js";
import { parseIntParam } from "../../utils/params.utils.js";

/**
 * Láy danh sách đề thi công khai cho User
 */
export const getPublicExams = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.query.userId);
    const exams = await ExamService.getPublicExams(userId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data: exams });
  } catch (error) {
    console.error("Lỗi getPublicExams:", error);
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};

/**
 * Lấy thông tin tổng quan đề thi
 */
export const getExamDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam_sets.findUnique({
      where: { id: parseInt(String(id), 10), status: "PUBLISHED" },
    });
    if (!exam) return res.status(404).json({ message: "Không tìm thấy đề thi", statusCode: 404 });
    return res.status(200).json({ message: "Thành công", statusCode: 200, data: exam });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};

/**
 * Lấy danh sách câu hỏi đề thi (ẩn đáp án đúng)
 */
export const getExamQuestions = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id) ?? 0;
    console.log(`[Backend] 📥 Receiving getExamQuestions for examId: ${examId}`);
    const questions = await ExamService.getSanitizedExamQuestions(examId);
    console.log(`[Backend] ✅ Sending ${questions.length} questions for examId: ${examId}`);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data: { questions } });
  } catch (error: any) {
    console.error(`[Backend] ❌ Error in getExamQuestions:`, error.message);
    return res.status(404).json({ message: error.message, statusCode: 404 });
  }
};

/**
 * Bắt đầu phiên làm bài mới
 */
export const startTestSession = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id) ?? 0;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const session = await TestSessionService.startSession(userId, examId);
    return res.status(201).json({ message: "Thành công", statusCode: 201, data: { sessionId: session.id } });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Nộp bài thi
 */
export const submitTestSession = async (req: Request, res: Response) => {
  try {
    const { id, sessionId } = req.params;
    const { answers, isPractice } = req.body;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await TestSessionService.submitAnswers(
      Number(sessionId), 
      Number(id), 
      userId, 
      answers, 
      isPractice
    );

    return res.status(200).json({ message: "Nộp bài thành công", statusCode: 200, data: result });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Xem tổng quan kết quả phiên làm bài
 */
export const getTestSessionSummary = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const userId = req.auth?.userId;
    if (!userId || !examId || !sessionId) return res.status(400).json({ message: "Tham số thiếu" });

    const data = await TestSessionService.getSessionSummary(examId, sessionId, userId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error: any) {
    return res.status(404).json({ message: error.message, statusCode: 404 });
  }
};

/**
 * Lấy danh sách các Part trong phiên làm bài
 */
export const getTestSessionParts = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const userId = req.auth?.userId;
    if (!userId || !examId || !sessionId) return res.status(400).json({ message: "Tham số thiếu" });

    const data = await TestSessionService.getSessionSummary(examId, sessionId, userId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data: { parts: data.part_stats } });
  } catch (error: any) {
    return res.status(404).json({ message: error.message, statusCode: 404 });
  }
};

/**
 * Lấy danh sách câu hỏi của một Part trong phiên
 */
export const getTestSessionPartQuestions = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const partNumber = parseIntParam(req.params.partNumber);
    const userId = req.auth?.userId;
    if (!userId || !examId || !sessionId || !partNumber) return res.status(400).json({ message: "Tham số thiếu" });

    const data = await TestSessionService.getTestSessionPartQuestions(examId, sessionId, partNumber, userId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

/**
 * Chi tiết câu hỏi trong phiên (kèm giải thích AI)
 */
export const getTestSessionQuestionDetail = async (req: Request, res: Response) => {
  try {
    const examId = parseIntParam(req.params.id);
    const sessionId = parseIntParam(req.params.sessionId);
    const questionId = parseIntParam(req.params.questionId);
    const userId = req.auth?.userId;
    if (!userId || !examId || !sessionId || !questionId) return res.status(400).json({ message: "Tham số thiếu" });

    const data = await TestSessionService.getQuestionDetail(examId, sessionId, questionId, userId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

/**
 * Lịch sử làm sai
 */
export const getWrongAnswerHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const data = await TestSessionService.getWrongAnswerHistory(userId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};
