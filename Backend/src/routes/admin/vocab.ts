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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.get("/", getSystemVocabSets);
router.post("/", createSystemVocabSet);
router.get("/:setId", getSystemVocabSetDetail);
router.patch("/:setId", updateSystemVocabSet);
router.patch("/:setId/status", updateSystemVocabSetStatus);
router.post("/:setId/warn", warnUserVocabSet);
router.delete("/:setId", softDeleteSystemVocabSet);
router.post("/:setId/restore", restoreSystemVocabSet);
router.post("/import", upload.single("file"), importSystemVocabSet);

export default router;
