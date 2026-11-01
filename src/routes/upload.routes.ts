import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new AppError(
          400,
          "Upload a JPG, PNG, WebP, GIF, or AVIF image.",
          "INVALID_IMAGE_TYPE",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

interface ImgBbResponse {
  success?: boolean;
  data?: {
    url?: string;
    display_url?: string;
    thumb?: {
      url?: string;
    };
  };
  error?: {
    message?: string;
  };
}

router.post(
  "/",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!env.IMGBB_API_KEY) {
      throw new AppError(
        503,
        "Image uploads are not configured on this server.",
        "UPLOAD_NOT_CONFIGURED",
      );
    }

    if (!req.file) {
      throw new AppError(
        400,
        "Choose an image file to upload.",
        "IMAGE_REQUIRED",
      );
    }

    const body = new URLSearchParams({
      image: req.file.buffer.toString("base64"),
      name: req.file.originalname.replace(/\.[^.]+$/, "").slice(0, 80),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(env.IMGBB_API_KEY)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
          signal: controller.signal,
        },
      );
    } catch {
      throw new AppError(
        502,
        "The image host could not be reached. Please try again.",
        "IMAGE_HOST_UNAVAILABLE",
      );
    } finally {
      clearTimeout(timeout);
    }

    const result = (await response.json().catch(() => null)) as
      | ImgBbResponse
      | null;

    const imageUrl = result?.data?.url ?? result?.data?.display_url;
    if (!response.ok || !result?.success || !imageUrl) {
      throw new AppError(
        502,
        result?.error?.message ??
          "The image host rejected this upload. Please try another file.",
        "IMAGE_UPLOAD_FAILED",
      );
    }

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully.",
      data: {
        url: imageUrl,
        thumbUrl: result.data?.thumb?.url ?? imageUrl,
      },
    });
  }),
);

export default router;
