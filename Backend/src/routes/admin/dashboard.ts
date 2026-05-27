import express from "express";
import {
  exportDashboardReport,
  getDashboardOverview,
  getUserFlashcardSetDetail,
  getDashboardUsers,
  getUserProfile,
  moderateUserFlashcardSet,
  warnUserFlashcardSet,
} from "../../controllers/admin/dashboard.js";

const router = express.Router();

// Dashboard tổng quan, thống kê người dùng và xử lý flashcard của user.
router.get("/overview", getDashboardOverview);
router.get("/export", exportDashboardReport);
router.get("/users", getDashboardUsers);
router.get("/users/:userId/profile", getUserProfile);
router.get("/users/:userId/flashcards/:setId", getUserFlashcardSetDetail);
// Cảnh báo hoặc xóa bộ flashcard của user khi cần moderating.
router.post("/users/:userId/flashcards/:setId/warn", warnUserFlashcardSet);
router.delete("/users/:userId/flashcards/:setId", moderateUserFlashcardSet);

export default router;
