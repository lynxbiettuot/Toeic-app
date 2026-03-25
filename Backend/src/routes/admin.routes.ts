import express from "express";
import examRoutes from "./admin/exam.js";

const router = express.Router();

router.use("/exams", examRoutes);

export default router;
