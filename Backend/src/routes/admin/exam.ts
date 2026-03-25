import express from "express";
import multer from "multer";
import {
  createQuestion,
  createManualExam,
  getAdminExamList,
  getExamQuestions,
  getQuestionDetail,
  importExamFromExcel,
  restoreExam,
  softDeleteExam,
  updateExam,
  updateExamStatus,
  updateQuestionDetail,
} from "../../controllers/admin/exam.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const isExcelFile =
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.toLowerCase().endsWith(".xlsx");

    if (!isExcelFile) {
      callback(new Error("Chỉ chấp nhận file Excel .xlsx."));
      return;
    }

    callback(null, true);
  },
});

router.get("/", getAdminExamList);
router.post("/", createManualExam);
router.get("/:examSetId/questions", getExamQuestions);
router.post("/:examSetId/questions", createQuestion);
router.get("/:examSetId/questions/:questionNumber", getQuestionDetail);
router.patch("/:examSetId", updateExam);
router.patch("/:examSetId/status", updateExamStatus);
router.delete("/:examSetId", softDeleteExam);
router.post("/:examSetId/restore", restoreExam);
router.patch("/:examSetId/questions/:questionNumber", updateQuestionDetail);
router.post("/import-excel", upload.single("excelFile"), importExamFromExcel);

export default router;
