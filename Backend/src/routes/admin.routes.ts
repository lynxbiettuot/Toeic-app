import express from "express";
import examRoutes from "./admin/exam.js";
import dashboardRoutes from "./admin/dashboard.js";
import vocabRoutes from "./admin/vocab.js";
import { requireAdminAuth } from "../middlewares/auth.js";

const router = express.Router();

// Chỉ cho phép admin đã xác thực đi vào các nhóm route quản trị.
router.use(requireAdminAuth);
// Quản lý đề thi TOEIC trên giao diện admin.
router.use("/exams", examRoutes);
// Thống kê người dùng, kết quả và thao tác moderating flashcard.
router.use("/dashboard", dashboardRoutes);
// Quản lý bộ từ vựng hệ thống.
router.use("/vocab-sets", vocabRoutes);

export default router;
