import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isStrongPassword = (password: string): boolean => {
  return password.length >= 8;
};

// ==========================================
// CẤU HÌNH GỬI EMAIL (Nodemailer)
// ==========================================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpNotification(userEmail: string, otp: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "OTP to reset password",
    text: `Your OTP password is ${otp}. \nDo not share your OTP with anyone else. Validation code will expire in 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent to:", userEmail);
  } catch (err) {
    console.error("Error sending OTP email:", err);
  }
}

// ==========================================
// ĐĂNG KÝ USER (SIGNUP)
// ==========================================
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, confirmPassword, name } = req.body;
    console.log(req.body)

    // Validate input
    if (!email || !password || !confirmPassword || !name) {
      return res.status(400).json({
        message: "All fields are required",
        statusCode: 400,
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        statusCode: 400,
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
        statusCode: 400,
      });
    }

    // 1. Kiểm tra email tồn tại
    const existUser = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existUser) {
      return res.status(400).json({
        message: "Account has already existed!",
        statusCode: 400,
      });
    }

    // 2. Kiểm tra mật khẩu
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Confirm password is not valid",
        statusCode: 400,
      });
    }

    // 3. Mã hóa mật khẩu & Lưu user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await prisma.users.create({
      data: {
        email: email.trim().toLowerCase(),
        password_hash: hashedPassword,
        full_name: name,
      },
    });

    const { password_hash, reset_otp, otp_expiry, ...dataReply } = newUser;

    return res.status(200).json({
      message: "Register success!",
      statusCode: 200,
      data: dataReply,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// ==========================================
// ĐĂNG NHẬP USER
// ==========================================
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Bad request",
        statusCode: 400,
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        statusCode: 400,
      });
    }

    // 1. Tìm user
    const currentUser = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!currentUser) {
      return res.status(404).json({
        message: "Account not found!",
        statusCode: 404,
      });
    }

    // 2. Kiểm tra user có active không
    if (!currentUser.is_active) {
      return res.status(403).json({
        message: "Account is inactive!",
        statusCode: 403,
      });
    }

    // 3. So sánh mật khẩu
    const isEqual = await bcrypt.compare(password, currentUser.password_hash);
    if (!isEqual) {
      return res.status(401).json({
        message: "Password or email is invalid, please try again!",
        statusCode: 401,
      });
    }

    // 4. Tạo Token
    const accessToken = jwt.sign(
      { email: currentUser.email, userId: currentUser.id, role: "USER" },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      { email: currentUser.email, userId: currentUser.id, role: "USER" },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "7d" },
    );

    // 5. Lưu Refresh Token vào Database
    await prisma.refresh_tokens.create({
      data: {
        token: refreshToken,
        user_id: currentUser.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 6. Trả về Cookie
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, reset_otp, otp_expiry, ...userData } = currentUser;

    return res.status(200).json({
      message: "User login success",
      statusCode: 200,
      role: "USER",
      accessToken,
      refreshToken,
      userData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// ==========================================
// ĐĂNG NHẬP ADMIN
// ==========================================
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Bad request",
        statusCode: 400,
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        statusCode: 400,
      });
    }

    // 1. Tìm admin
    const currentAdmin = await prisma.admins.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!currentAdmin) {
      return res.status(404).json({
        message: "Admin account not found!",
        statusCode: 404,
      });
    }

    // 2. Kiểm tra admin có active không
    if (!currentAdmin.is_active) {
      return res.status(403).json({
        message: "Admin account is inactive!",
        statusCode: 403,
      });
    }

    // 3. So sánh mật khẩu
    const isEqual = await bcrypt.compare(password, currentAdmin.password_hash);
    if (!isEqual) {
      return res.status(401).json({
        message: "Password or email is invalid, please try again!",
        statusCode: 401,
      });
    }

    // 4. Tạo Token
    const accessToken = jwt.sign(
      {
        email: currentAdmin.email,
        adminId: currentAdmin.id,
        role: currentAdmin.role,
      },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      {
        email: currentAdmin.email,
        adminId: currentAdmin.id,
        role: currentAdmin.role,
      },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "7d" },
    );

    // 5. Lưu Refresh Token vào Admin_refresh_tokens
    await prisma.admin_refresh_tokens.create({
      data: {
        token: refreshToken,
        admin_id: currentAdmin.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 6. Trả về Cookie
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, reset_otp, otp_expiry, ...adminData } = currentAdmin;

    return res.status(200).json({
      message: "Admin login success",
      statusCode: 200,
      role: currentAdmin.role,
      accessToken,
      refreshToken,
      adminData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// ==========================================
// LẤY ACCESS TOKEN MỚI TỪ REFRESH TOKEN
// ==========================================
export const getAccessToken = async (req: Request, res: Response) => {
  try {
    // Ưu tiên lấy từ Body (cho Mobile) hoặc Cookie (cho Web)
    const currentRefreshToken = req.body?.refreshToken || req.cookies?.jwt;

    if (!currentRefreshToken) {
      return res.status(401).json({
        message: "Unauthorized: No token provided",
        statusCode: 401,
      });
    }

    try {
      const decoded = jwt.verify(
        currentRefreshToken,
        process.env.JWT_REFRESH_SECRET as string,
      ) as any;

      // Kiểm tra xem là User hay Admin dựa trên userId hay adminId
      if (decoded.userId) {
        // User refresh token
        const tokenInDb = await prisma.refresh_tokens.findUnique({
          where: { token: currentRefreshToken },
        });

        if (!tokenInDb) {
          return res.status(403).json({
            message: "Forbidden: Invalid token",
            statusCode: 403,
          });
        }

        const newAccessToken = jwt.sign(
          { email: decoded.email, userId: decoded.userId, role: "USER" },
          process.env.JWT_ACCESS_SECRET as string,
          { expiresIn: "1h" },
        );

        return res.json({
          accessToken: newAccessToken,
          statusCode: 200,
        });
      } else if (decoded.adminId) {
        // Admin refresh token
        const tokenInDb = await prisma.admin_refresh_tokens.findUnique({
          where: { token: currentRefreshToken },
        });

        if (!tokenInDb) {
          return res.status(403).json({
            message: "Forbidden: Invalid token",
            statusCode: 403,
          });
        }

        const newAccessToken = jwt.sign(
          {
            email: decoded.email,
            adminId: decoded.adminId,
            role: decoded.role,
          },
          process.env.JWT_ACCESS_SECRET as string,
          { expiresIn: "1h" },
        );

        return res.json({
          accessToken: newAccessToken,
          statusCode: 200,
        });
      }
    } catch (err) {
      return res.status(403).json({
        message: "Forbidden: Token expired or invalid",
        statusCode: 403,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// ==========================================
// LOGOUT USER
// ==========================================
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const currentRefreshToken = req.cookies?.jwt;

    if (currentRefreshToken) {
      await prisma.refresh_tokens
        .delete({
          where: { token: currentRefreshToken },
        })
        .catch(() => {});
    }

    res.clearCookie("jwt");
    return res.json({
      message: "User logout success!",
      statusCode: 200,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// ==========================================
// LOGOUT ADMIN
// ==========================================
export const logoutAdmin = async (req: Request, res: Response) => {
  try {
    const currentRefreshToken = req.cookies?.jwt;

    if (currentRefreshToken) {
      await prisma.admin_refresh_tokens
        .delete({
          where: { token: currentRefreshToken },
        })
        .catch(() => {});
    }

    res.clearCookie("jwt");
    return res.json({
      message: "Admin logout success!",
      statusCode: 200,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// ==========================================
// GỬI OTP QUÊN MẬT KHẨU (USER)
// ==========================================
export const handleSendOtpUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        statusCode: 400,
      });
    }

    const currentUser = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!currentUser) {
      return res.status(404).json({
        message: "Account does not exist!",
        statusCode: 404,
      });
    }

    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.users.update({
      where: { email: email.trim().toLowerCase() },
      data: {
        reset_otp: otp,
        otp_expiry: otpExpiry,
      },
    });

    await sendOtpNotification(email, otp);

    return res.json({
      message: "OTP has been sent to your email!",
      statusCode: 200,
      email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error!",
      statusCode: 500,
    });
  }
};

// ==========================================
// GỬI OTP QUÊN MẬT KHẨU (ADMIN)
// ==========================================
export const handleSendOtpAdmin = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        statusCode: 400,
      });
    }

    const currentAdmin = await prisma.admins.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!currentAdmin) {
      return res.status(404).json({
        message: "Admin account does not exist!",
        statusCode: 404,
      });
    }

    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.admins.update({
      where: { email: email.trim().toLowerCase() },
      data: {
        reset_otp: otp,
        otp_expiry: otpExpiry,
      },
    });

    await sendOtpNotification(email, otp);

    return res.json({
      message: "OTP has been sent to your email!",
      statusCode: 200,
      email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error!",
      statusCode: 500,
    });
  }
};

// ==========================================
// XÁC THỰC OTP & ĐỔI MẬT KHẨU (USER)
// ==========================================
export const handleVerifyOtpAndResetPasswordUser = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, otpVerify, newPassword, confirmNewPassword } = req.body;

    if (!email || !otpVerify || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        message: "All fields are required",
        statusCode: 400,
      });
    }

    if (confirmNewPassword !== newPassword) {
      return res.status(400).json({
        message: "Passwords do not match!",
        statusCode: 400,
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
        statusCode: 400,
      });
    }

    const currentUser = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!currentUser) {
      return res.status(404).json({
        message: "Account does not exist!",
        statusCode: 404,
      });
    }

    // Kiểm tra OTP hết hạn
    if (!currentUser.otp_expiry || new Date() > currentUser.otp_expiry) {
      return res.status(401).json({
        message: "OTP is expired!",
        statusCode: 401,
      });
    }

    // Kiểm tra OTP có khớp không
    if (currentUser.reset_otp !== otpVerify) {
      return res.status(401).json({
        message: "OTP is not valid!",
        statusCode: 401,
      });
    }

    // Cập nhật mật khẩu và xóa OTP
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.users.update({
      where: { email: email.trim().toLowerCase() },
      data: {
        password_hash: hashedPassword,
        reset_otp: null,
        otp_expiry: null,
      },
    });

    return res.status(200).json({
      message: "Password has been successfully changed!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error!",
      statusCode: 500,
    });
  }
};

// ==========================================
// XÁC THỰC OTP & ĐỔI MẬT KHẨU (ADMIN)
// ==========================================
export const handleVerifyOtpAndResetPasswordAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, otpVerify, newPassword, confirmNewPassword } = req.body;

    if (!email || !otpVerify || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        message: "All fields are required",
        statusCode: 400,
      });
    }

    if (confirmNewPassword !== newPassword) {
      return res.status(400).json({
        message: "Passwords do not match!",
        statusCode: 400,
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
        statusCode: 400,
      });
    }

    const currentAdmin = await prisma.admins.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!currentAdmin) {
      return res.status(404).json({
        message: "Admin account does not exist!",
        statusCode: 404,
      });
    }

    // Kiểm tra OTP hết hạn
    if (!currentAdmin.otp_expiry || new Date() > currentAdmin.otp_expiry) {
      return res.status(401).json({
        message: "OTP is expired!",
        statusCode: 401,
      });
    }

    // Kiểm tra OTP có khớp không
    if (currentAdmin.reset_otp !== otpVerify) {
      return res.status(401).json({
        message: "OTP is not valid!",
        statusCode: 401,
      });
    }

    // Cập nhật mật khẩu và xóa OTP
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.admins.update({
      where: { email: email.trim().toLowerCase() },
      data: {
        password_hash: hashedPassword,
        reset_otp: null,
        otp_expiry: null,
      },
    });

    return res.status(200).json({
      message: "Password has been successfully changed!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error!",
      statusCode: 500,
    });
  }
};
// ==========================================
// XÁC THỰC OTP CHỈ ĐỂ KIỂM TRA (USER)
// ==========================================
export const handleVerifyOtpOnlyUser = async (req: Request, res: Response) => {
  try {
    const { email, otpVerify } = req.body;

    if (!email || !otpVerify) {
      return res.status(400).json({
        message: "Email and OTP are required",
        statusCode: 400,
      });
    }

    const currentUser = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!currentUser) {
      return res.status(404).json({
        message: "Account does not exist!",
        statusCode: 404,
      });
    }

    if (!currentUser.otp_expiry || new Date() > currentUser.otp_expiry) {
      return res.status(401).json({
        message: "OTP is expired!",
        statusCode: 401,
      });
    }

    if (currentUser.reset_otp !== otpVerify) {
      return res.status(401).json({
        message: "OTP is not valid!",
        statusCode: 401,
      });
    }

    return res.status(200).json({
      message: "OTP is valid. You can reset your password now.",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error!",
      statusCode: 500,
    });
  }
};

// ==========================================
// XÁC THỰC OTP CHỈ ĐỂ KIỂM TRA (ADMIN)
// ==========================================
export const handleVerifyOtpOnlyAdmin = async (req: Request, res: Response) => {
  try {
    const { email, otpVerify } = req.body;

    if (!email || !otpVerify) {
      return res.status(400).json({
        message: "Email and OTP are required",
        statusCode: 400,
      });
    }

    const currentAdmin = await prisma.admins.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!currentAdmin) {
      return res.status(404).json({
        message: "Admin account does not exist!",
        statusCode: 404,
      });
    }

    if (!currentAdmin.otp_expiry || new Date() > currentAdmin.otp_expiry) {
      return res.status(401).json({
        message: "OTP is expired!",
        statusCode: 401,
      });
    }

    if (currentAdmin.reset_otp !== otpVerify) {
      return res.status(401).json({
        message: "OTP is not valid!",
        statusCode: 401,
      });
    }

    return res.status(200).json({
      message: "OTP is valid. You can reset your password now.",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error!",
      statusCode: 500,
    });
  }
};
