import express from "express";
import multer from "multer";
import {
  createSystemVocabSet,
  getSystemVocabSetDetail,
  getSystemVocabSets,
  importSystemVocabSet,
  restoreSystemVocabSet,
  softDeleteSystemVocabSet,
  updateSystemVocabSet,
  updateSystemVocabSetStatus,
  warnUserVocabSet,
} from "../../controllers/admin/vocab.js";

const router = express.Router();

// Lưu file import Excel/CSV vào RAM để service tự bóc tách dữ liệu.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// CRUD bộ từ vựng hệ thống cho admin.
router.get("/", getSystemVocabSets);
router.post("/", createSystemVocabSet);
router.get("/:setId", getSystemVocabSetDetail);
router.patch("/:setId", updateSystemVocabSet);
router.patch("/:setId/status", updateSystemVocabSetStatus);
// Gắn cờ cảnh báo cho bộ từ vựng của user khi nội dung không phù hợp.
router.post("/:setId/warn", warnUserVocabSet);
router.delete("/:setId", softDeleteSystemVocabSet);
router.post("/:setId/restore", restoreSystemVocabSet);
// Import bộ từ vựng từ file Excel/CSV lên hệ thống.
router.post("/import", upload.single("file"), importSystemVocabSet);

export default router;
