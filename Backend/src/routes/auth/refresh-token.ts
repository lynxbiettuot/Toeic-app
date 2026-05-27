import express from "express";
import { getAccessToken } from "../../controllers/auth/auth.js";

const router = express.Router();

// Cấp lại access token từ refresh token cho cả web và mobile.
router.post("/", getAccessToken);

export default router;