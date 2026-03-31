import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AuthPayload = {
  email?: string;
  userId?: number;
  adminId?: number;
  role: string;
};

const getBearerToken = (req: Request) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized: Missing access token.",
      statusCode: 401,
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string,
    ) as AuthPayload;

    if (!decoded.userId && !decoded.adminId) {
      return res.status(401).json({
        message: "Unauthorized: Invalid access token payload.",
        statusCode: 401,
      });
    }

    req.auth = {
      email: decoded.email,
      userId: decoded.userId,
      adminId: decoded.adminId,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized: Invalid or expired access token.",
      statusCode: 401,
    });
  }
};

export const requireUserAuth = (req: Request, res: Response, next: NextFunction) => {
  return requireAuth(req, res, () => {
    if (!req.auth?.userId) {
      return res.status(403).json({
        message: "Forbidden: User access required.",
        statusCode: 403,
      });
    }

    return next();
  });
};

export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  return requireAuth(req, res, () => {
    if (!req.auth?.adminId) {
      return res.status(403).json({
        message: "Forbidden: Admin access required.",
        statusCode: 403,
      });
    }

    return next();
  });
};
