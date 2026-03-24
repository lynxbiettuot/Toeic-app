import express from "express";
import { 
    logoutUser, 
    logoutAdmin 
} from "../../controllers/auth/auth.js";

const router = express.Router();

// ==========================================
// USER LOGOUT
// ==========================================
router.post("/user", logoutUser);

// ==========================================
// ADMIN LOGOUT
// ==========================================
router.post("/admin", logoutAdmin);

export default router;