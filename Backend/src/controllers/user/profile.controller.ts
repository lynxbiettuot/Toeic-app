import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

/**
 * Lấy thông tin hồ sơ của User hiện tại
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        statusCode: 401,
      });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      message: "Success",
      statusCode: 200,
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

/**
 * Cập nhật thông tin hồ sơ (Tên & Avatar)
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { full_name, avatar_url } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        statusCode: 401,
      });
    }

    // Validate input
    if (full_name && full_name.trim().length < 2) {
      return res.status(400).json({
        message: "Name is too short",
        statusCode: 400,
      });
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        full_name: full_name?.trim(),
        avatar_url: avatar_url,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      statusCode: 200,
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};
