import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { verifyAuthToken } from "../lib/jwt";
import { AppError } from "../utils/AppError";

function readToken(req: Request): string | null {
  const cookieToken = req.cookies?.[env.COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const headerToken = header.slice(7).trim();
    if (headerToken.length > 0) {
      return headerToken;
    }
  }

  return null;
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = readToken(req);

  if (!token) {
    next(new AppError(401, "Authentication required. Please sign in.", "UNAUTHORIZED"));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      photoURL: payload.photoURL,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(
        new AppError(
          401,
          "Your session has expired. Please sign in again.",
          "SESSION_EXPIRED",
        ),
      );
      return;
    }

    next(
      new AppError(
        401,
        "Invalid session. Please sign in again.",
        "INVALID_SESSION",
      ),
    );
  }
}
