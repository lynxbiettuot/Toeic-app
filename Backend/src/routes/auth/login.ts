import express from "express";
import {
    loginUser,
    loginAdmin
} from "../../controllers/auth/auth.js";

const router = express.Router();

// Đăng nhập user cho app học viên.
router.post("/user", loginUser);

// Đăng nhập admin cho FrontendWeb.
router.post("/admin", loginAdmin);

export default router;