import express from "express";
import { signup } from "../../controllers/auth/auth.js";

const router = express.Router();

// ==========================================
// USER SIGNUP
// ==========================================
router.post("/", signup);

export default router;