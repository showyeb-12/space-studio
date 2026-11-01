import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter, authLimiter } from "./middleware/rateLimit";
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/booking.routes";
import healthRoutes from "./routes/health.routes";
import studioRoutes from "./routes/studio.routes";
import uploadRoutes from "./routes/upload.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import { AppError } from "./utils/AppError";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === env.CLIENT_URL) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, "Origin is not allowed.", "CORS_BLOCKED"));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "StudioSpace API",
      data: { version: "1.0.0", health: "/api/health" },
    });
  });

  app.use("/api", apiLimiter);
  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/studios", studioRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/wishlist", wishlistRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
