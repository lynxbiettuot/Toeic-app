import express from "express";
import { 
    handleVerifyOtpAndResetPasswordUser, 
    handleVerifyOtpAndResetPasswordAdmin,
    handleVerifyOtpOnlyUser,
    handleVerifyOtpOnlyAdmin} from "../../controllers/auth/auth.js";

const router = express.Router();

// ==========================================
// VERIFY OTP & RESET PASSWORD FOR USER
// ==========================================
router.post("/user", handleVerifyOtpAndResetPasswordUser);
router.post("/verify-user", handleVerifyOtpOnlyUser);

// ==========================================
// VERIFY OTP & RESET PASSWORD FOR ADMIN
// ==========================================
router.post("/admin", handleVerifyOtpAndResetPasswordAdmin);
router.post("/verify-admin", handleVerifyOtpOnlyAdmin);

export default router;