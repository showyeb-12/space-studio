import type { Request } from "express";
import type { AuthUser } from "../types/models";
import { AppError } from "./AppError";

export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(
      401,
      "Authentication required. Please sign in.",
      "UNAUTHORIZED",
    );
  }

  return req.user;
}
