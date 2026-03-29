import express from "express";
import examRoutes from "./admin/exam.js";
import dashboardRoutes from "./admin/dashboard.js";
import vocabRoutes from "./admin/vocab.js";
import { requireAdminAuth } from "../middlewares/auth.js";

const router = express.Router();

router.use(requireAdminAuth);
router.use("/exams", examRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/vocab-sets", vocabRoutes);

export default router;
