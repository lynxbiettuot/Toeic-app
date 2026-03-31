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
  getTestSessionQuestionDetail,
  getWrongAnswerHistory
} from "../../controllers/user/exam.js";
import { requireUserAuth } from "../../middlewares/auth.js";

const router = express.Router();

router.get("/", getPublicExams);
router.get("/wrong-answers", requireUserAuth, getWrongAnswerHistory);
router.get("/:id", getExamDetails);
router.get("/:id/questions", getExamQuestions);
router.post("/:id/sessions", requireUserAuth, startTestSession);
router.post("/:id/sessions/:sessionId/submit", requireUserAuth, submitTestSession);
router.get("/:id/sessions/:sessionId/summary", requireUserAuth, getTestSessionSummary);
router.get("/:id/sessions/:sessionId/parts", requireUserAuth, getTestSessionParts);
router.get("/:id/sessions/:sessionId/parts/:partNumber/questions", requireUserAuth, getTestSessionPartQuestions);
router.get("/:id/sessions/:sessionId/questions/:questionId", requireUserAuth, getTestSessionQuestionDetail);

export default router;
