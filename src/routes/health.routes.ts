import { Router } from "express";
import { connectDB } from "../db/mongo";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const db = await connectDB();
    await db.command({ ping: 1 });

    res.status(200).json({
      success: true,
      message: "StudioSpace API is running.",
      data: {
        status: "ok",
        database: "connected",
        environment: env.NODE_ENV,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

export default router;
