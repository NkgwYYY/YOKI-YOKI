import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  req.userId = userId;
  next();
}
