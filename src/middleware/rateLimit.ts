import rateLimit from "express-rate-limit";
import { isTest } from "../config/env";

const skip = () => isTest;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    message: "Too many requests. Please try again in a few minutes.",
    code: "RATE_LIMITED",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    code: "AUTH_RATE_LIMITED",
  },
});
