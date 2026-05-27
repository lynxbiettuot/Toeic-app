import express from "express";
import { getProfile, updateProfile } from "../../controllers/user/profile.controller.js";
import { requireUserAuth } from "../../middlewares/auth.js";

const router = express.Router();

/**
 * @route GET /auth/profile
 * @desc Lấy thông tin hồ sơ người dùng để FrontendWeb hiển thị và cho phép sửa.
 * @access Private
 */
router.get("/", requireUserAuth, getProfile);

/**
 * @route PATCH /auth/profile/update
 * @desc Cập nhật thông tin hồ sơ (tên và avatar) của user.
 * @access Private
 */
router.patch("/update", requireUserAuth, updateProfile);

export default router;
