import express from "express";
import { 
  getPublicExams, 
  getExamDetails, 
  getExamQuestions, 
  startTestSession, 
  submitTestSession 
} from "../../controllers/user/exam.js";

const router = express.Router();

router.get("/", getPublicExams);
router.get("/:id", getExamDetails);
router.get("/:id/questions", getExamQuestions);
router.post("/:id/sessions", startTestSession);
router.post("/:id/sessions/:sessionId/submit", submitTestSession);

export default router;
