import express from "express";
import { getAccessToken } from "../../controllers/auth/auth.js";

const router = express.Router();

// ==========================================
// GET NEW ACCESS TOKEN FROM REFRESH TOKEN
// ==========================================
router.post("/", getAccessToken);

export default router;