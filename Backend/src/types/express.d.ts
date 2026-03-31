declare global {
  namespace Express {
    interface Request {
      auth?: {
        email?: string;
        userId?: number;
        adminId?: number;
        role: string;
      };
    }
  }
}

export {};
