import type { CookieOptions, Response } from "express";
import { env, isProduction } from "../config/env";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

export const authCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, baseCookieOptions);
}
