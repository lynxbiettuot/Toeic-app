import type { Request, Response } from "express";
import { ExamService } from "../../services/exam.service.js";
import { parseIntParam, parseIntegerField } from "../../utils/params.utils.js";

/**
 * Import đề thi từ Excel cho màn quản trị đề thi TOEIC.
 */
export const importExamFromExcel = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "Vui lòng upload file Excel.", statusCode: 400 });
  }

  try
  {
    console.log(req.file)
    const { title, year, type, createdBy } = req.body;
    const adminId = parseIntegerField(createdBy, undefined);

    if (!title || !year) {
      return res.status(400).json({ message: "Thiếu thông tin tiêu đề hoặc năm.", statusCode: 400 });
    }

    const exam = await ExamService.importExamFromExcel(req.file.buffer, {
      title,
      year: parseIntegerField(year, 0) ?? 0,
      type,
      createdBy: adminId
    });

    return res.status(200).json({
      message: "Import đề thi thành công.",
      statusCode: 200,
      data: exam
    });
  } catch (error) {
    console.error("Lỗi import đề thi:", error);
    return res.status(500).json({
      message: "Lỗi khi import đề thi.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500
    });
  }
};

/**
 * Lấy danh sách đề thi cho màn quản lý đề thi trong FrontendWeb.
 */
export const getAdminExamList = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const year = typeof req.query.year === "string" ? parseInt(req.query.year, 10) : undefined;

    const exams = await ExamService.getAdminExams({ search, status, year });
    return res.status(200).json({ message: "Thành công", statusCode: 200, data: exams });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};

/**
 * Lấy danh sách câu hỏi cơ bản để màn chi tiết đề hiển thị danh sách câu.
 */
export const getExamQuestions = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    if (!examSetId) return res.status(400).json({ message: "ID không hợp lệ" });

    const data = await ExamService.getExamQuestions(examSetId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};

/**
 * Lấy chi tiết câu hỏi để màn editor/preview trong FrontendWeb sử dụng.
 */
export const getQuestionDetail = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    const questionNumber = parseIntParam(req.params.questionNumber);
    if (!examSetId || !questionNumber) return res.status(400).json({ message: "Tham số không hợp lệ" });

    const data = await ExamService.getQuestionDetail(examSetId, questionNumber);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};

/**
 * Tạo đề thi thủ công từ màn Thêm mới trong FrontendWeb.
 */
export const createManualExam = async (req: Request, res: Response) => {
  try {
    const { title, year, type } = req.body;
    const exam = await ExamService.createManualExam({
      title,
      year: parseIntegerField(year),
      type
    });
    return res.status(201).json({ message: "Tạo đề thành công", statusCode: 201, data: exam });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Cập nhật thông tin cơ bản của đề thi từ màn chi tiết.
 */
export const updateExam = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    if (!examSetId) return res.status(400).json({ message: "ID không hợp lệ" });
    
    const { title, year, type } = req.body;
    const exam = await ExamService.updateExam(examSetId, {
      title,
      year: parseIntegerField(year),
      type
    });
    return res.status(200).json({ message: "Cập nhật thành công", statusCode: 200, data: exam });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Cập nhật trạng thái đề thi public/private/draft.
 */
export const updateExamStatus = async (req: Request, res: Response) => {
  try {
    const { examSetId } = req.params;
    const { status } = req.body;
    const exam = await ExamService.updateExamStatus(Number(examSetId), status);
    return res.status(200).json({ message: "Cập nhật thành công", statusCode: 200, data: exam });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Xóa mềm đề thi để admin có thể khôi phục sau này.
 */
export const softDeleteExam = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    if (!examSetId) return res.status(400).json({ message: "ID không hợp lệ" });
    await ExamService.softDeleteExam(examSetId);
    return res.status(200).json({ message: "Xóa thành công", statusCode: 200 });
  } catch (error: any) {
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

/**
 * Khôi phục đề thi đã xóa mềm.
 */
export const restoreExam = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    if (!examSetId) return res.status(400).json({ message: "ID không hợp lệ" });
    await ExamService.restoreExam(examSetId);
    return res.status(200).json({ message: "Khôi phục thành công", statusCode: 200 });
  } catch (error: any) {
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

/**
 * Thêm câu hỏi mới vào đề thi đang mở trong màn chi tiết.
 */
export const createQuestion = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    if (!examSetId) return res.status(400).json({ message: "ID không hợp lệ" });
    
    const data = {
      ...req.body,
      part_number: parseIntegerField(req.body.part_number),
      question_number: parseIntegerField(req.body.question_number),
    };

    const question = await ExamService.createQuestion(examSetId, data);
    return res.status(201).json({ message: "Thành công", statusCode: 201, data: question });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Cập nhật chi tiết câu hỏi từ form chỉnh sửa trong FrontendWeb.
 */
export const updateQuestionDetail = async (req: Request, res: Response) => {
  try {
    const examSetId = parseIntParam(req.params.examSetId);
    const questionNumber = parseIntParam(req.params.questionNumber);
    if (!examSetId || !questionNumber) return res.status(400).json({ message: "Tham số thiếu" });

    const data = {
      ...req.body,
      part_number: parseIntegerField(req.body.part_number),
    };

    await ExamService.updateQuestionDetail(examSetId, questionNumber, data);
    return res.status(200).json({ message: "Thành công", statusCode: 200 });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};
