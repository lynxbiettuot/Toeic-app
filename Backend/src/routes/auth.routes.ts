import express from "express";
import loginRoutes from "./auth/login.js";
import signupRoutes from "./auth/signup.js";
import logoutRoutes from "./auth/logout.js";
import refreshTokenRoutes from "./auth/refresh-token.js";
import forgotPasswordRoutes from "./auth/forgot-password.js";
import resetPasswordRoutes from "./auth/reset-password.js";

const router = express.Router();

// ==========================================
// AUTH ROUTES
// ==========================================
router.use("/login", loginRoutes);
router.use("/signup", signupRoutes);
router.use("/logout", logoutRoutes);
router.use("/refresh-token", refreshTokenRoutes);
router.use("/forgot-password", forgotPasswordRoutes);
router.use("/reset-password", resetPasswordRoutes);

export default router;