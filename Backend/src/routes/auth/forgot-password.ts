import express from "express";
import { 
    handleSendOtpUser, 
    handleSendOtpAdmin 
} from "../../controllers/auth/auth.js";

const router = express.Router();

// ==========================================
// SEND OTP FOR USER PASSWORD RESET
// ==========================================
router.post("/user", handleSendOtpUser);

// ==========================================
// SEND OTP FOR ADMIN PASSWORD RESET
// ==========================================
router.post("/admin", handleSendOtpAdmin);

export default router;