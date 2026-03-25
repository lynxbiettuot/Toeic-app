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

router.get("/overview", getDashboardOverview);
router.get("/export", exportDashboardReport);
router.get("/users", getDashboardUsers);
router.get("/users/:userId/profile", getUserProfile);
router.get("/users/:userId/flashcards/:setId", getUserFlashcardSetDetail);
router.post("/users/:userId/flashcards/:setId/warn", warnUserFlashcardSet);
router.delete("/users/:userId/flashcards/:setId", moderateUserFlashcardSet);

export default router;
