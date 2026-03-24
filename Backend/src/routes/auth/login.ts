import express from "express";
import {
    loginUser,
    loginAdmin
} from "../../controllers/auth/auth.js";

const router = express.Router();

// ==========================================
// USER LOGIN
// ==========================================
router.post("/user", loginUser);

// ==========================================
// ADMIN LOGIN
// ==========================================
router.post("/admin", loginAdmin);

export default router;