import { Router } from "express";
import { ObjectId } from "mongodb";
import { getStudios, getWishlists } from "../db/mongo";
import { requireAuth } from "../middleware/requireAuth";
import { toPublicStudio } from "../types/models";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getAuthUser } from "../utils/auth";
import { parseObjectId } from "../utils/objectId";

const router = Router();

router.get(
  "/ids",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const wishlists = await getWishlists();

    const saved = await wishlists
      .find({ userEmail: user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Saved studio ids loaded.",
      data: {
        studioIds: saved.map((item) => item.studioId.toHexString()),
      },
    });
  }),
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const wishlists = await getWishlists();

    const saved = await wishlists
      .find({ userEmail: user.email })
      .sort({ createdAt: -1 })
      .toArray();

    if (saved.length === 0) {
      res.status(200).json({
        success: true,
        message: "No saved studios yet.",
        data: { studios: [] },
      });
      return;
    }

    const studios = await getStudios();
    const listings = await studios
      .find({ _id: { $in: saved.map((item) => item.studioId) } })
      .toArray();

    const listingMap = new Map(
      listings.map((studio) => [studio._id.toHexString(), studio]),
    );

    const ordered = saved
      .map((item) => listingMap.get(item.studioId.toHexString()))
      .filter((studio): studio is NonNullable<typeof studio> =>
        Boolean(studio),
      );

    res.status(200).json({
      success: true,
      message: "Saved studios loaded.",
      data: { studios: ordered.map(toPublicStudio) },
    });
  }),
);

router.post(
  "/:studioId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const studioId = parseObjectId(
      req.params.studioId ?? "",
      "studio",
    );
    const studios = await getStudios();

    const studio = await studios.findOne({ _id: studioId });
    if (!studio) {
      throw new AppError(404, "Studio not found.", "STUDIO_NOT_FOUND");
    }

    const wishlists = await getWishlists();
    const existing = await wishlists.findOne({
      userEmail: user.email,
      studioId,
    });

    if (existing) {
      await wishlists.deleteOne({ _id: existing._id });
      res.status(200).json({
        success: true,
        message: "Removed from saved studios.",
        data: {
          saved: false,
          studioId: studioId.toHexString(),
        },
      });
      return;
    }

    await wishlists.insertOne({
      _id: new ObjectId(),
      userEmail: user.email,
      studioId,
      createdAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Studio saved to your wishlist.",
      data: {
        saved: true,
        studioId: studioId.toHexString(),
      },
    });
  }),
);

export default router;
