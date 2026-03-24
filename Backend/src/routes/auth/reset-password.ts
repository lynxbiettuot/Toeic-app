import express from "express";
import { 
    handleVerifyOtpAndResetPasswordUser, 
    handleVerifyOtpAndResetPasswordAdmin 
} from "../../controllers/auth/auth.js";

const router = express.Router();

// ==========================================
// VERIFY OTP & RESET PASSWORD FOR USER
// ==========================================
router.post("/user", handleVerifyOtpAndResetPasswordUser);

// ==========================================
// VERIFY OTP & RESET PASSWORD FOR ADMIN
// ==========================================
router.post("/admin", handleVerifyOtpAndResetPasswordAdmin);

export default router;