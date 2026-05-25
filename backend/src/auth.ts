import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ uid: userId }, env.JWT_SECRET, { expiresIn: "30d" });
}

export function readToken(token: string): { uid: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { uid: string };
    if (!payload?.uid) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.COOKIE_NAME, { path: "/" });
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const payload = readToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid session" });
  req.userId = payload.uid;
  next();
}
