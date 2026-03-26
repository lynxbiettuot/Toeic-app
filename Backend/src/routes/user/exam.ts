import express from "express";
import { 
  getPublicExams, 
  getExamDetails, 
  getExamQuestions, 
  startTestSession, 
  submitTestSession,
  getTestSessionSummary,
  getTestSessionParts,
  getTestSessionPartQuestions,
  getTestSessionQuestionDetail
} from "../../controllers/user/exam.js";

const router = express.Router();

router.get("/", getPublicExams);
router.get("/:id", getExamDetails);
router.get("/:id/questions", getExamQuestions);
router.post("/:id/sessions", startTestSession);
router.post("/:id/sessions/:sessionId/submit", submitTestSession);
router.get("/:id/sessions/:sessionId/summary", getTestSessionSummary);
router.get("/:id/sessions/:sessionId/parts", getTestSessionParts);
router.get("/:id/sessions/:sessionId/parts/:partNumber/questions", getTestSessionPartQuestions);
router.get("/:id/sessions/:sessionId/questions/:questionId", getTestSessionQuestionDetail);

export default router;
