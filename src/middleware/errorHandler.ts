import type { ErrorRequestHandler, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { MongoServerError } from "mongodb";
import multer from "multer";
import { ZodError } from "zod";
import { isProduction, isTest } from "../config/env";
import { AppError } from "../utils/AppError";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} was not found.`,
    code: "NOT_FOUND",
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;
    const firstMessage =
      Object.values(fieldErrors).flat().find(Boolean) ??
      "Please check the submitted details.";

    res.status(400).json({
      success: false,
      message: firstMessage,
      code: "VALIDATION_ERROR",
      errors: fieldErrors,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Images must be 5 MB or smaller."
        : error.code === "LIMIT_FILE_COUNT"
          ? "Upload one image at a time."
          : "The image upload was rejected.";

    res.status(400).json({
      success: false,
      message,
      code: "UPLOAD_ERROR",
    });
    return;
  }

  if (error instanceof MongoServerError && error.code === 11000) {
    res.status(409).json({
      success: false,
      message: "A record with that value already exists.",
      code: "DUPLICATE_RECORD",
    });
    return;
  }

  if (error instanceof jwt.TokenExpiredError) {
    res.status(401).json({
      success: false,
      message: "Your session has expired. Please sign in again.",
      code: "SESSION_EXPIRED",
    });
    return;
  }

  if (error instanceof jwt.JsonWebTokenError) {
    res.status(401).json({
      success: false,
      message: "Invalid session. Please sign in again.",
      code: "INVALID_SESSION",
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      success: false,
      message: "The request body contains invalid JSON.",
      code: "INVALID_JSON",
    });
    return;
  }

  if (!isTest) {
    console.error("Unhandled server error:", error);
  }

  res.status(500).json({
    success: false,
    message: isProduction
      ? "Something went wrong. Please try again."
      : error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR",
  });
};
