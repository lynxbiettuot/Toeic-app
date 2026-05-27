import express from "express";
import { 
    logoutUser, 
    logoutAdmin 
} from "../../controllers/auth/auth.js";

const router = express.Router();

// Đăng xuất user và xóa refresh token trong DB.
router.post("/user", logoutUser);

// Đăng xuất admin và xóa refresh token trong DB.
router.post("/admin", logoutAdmin);

export default router;