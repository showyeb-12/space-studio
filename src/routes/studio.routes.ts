import { Router } from "express";
import { ObjectId, type Filter, type Sort } from "mongodb";
import { getStudios } from "../db/mongo";
import { requireAuth } from "../middleware/requireAuth";
import {
  createStudioSchema,
  studioQuerySchema,
  updateStudioSchema,
  type StudioSort,
} from "../schemas/studio.schema";
import {
  toPublicStudio,
  type NewStudio,
  type StudioDoc,
} from "../types/models";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getAuthUser } from "../utils/auth";
import { parseObjectId } from "../utils/objectId";

const router = Router();

const sortMap: Record<StudioSort, Sort> = {
  newest: { createdAt: -1 },
  rating: { rating: -1, reviewCount: -1, createdAt: -1 },
  "price-asc": { hourlyRate: 1 },
  "price-desc": { hourlyRate: -1 },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const studios = await getStudios();

    const listings = await studios
      .find({ ownerEmail: user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Your studio listings were loaded.",
      data: { studios: listings.map(toPublicStudio) },
    });
  }),
);

router.get(
  "/featured",
  asyncHandler(async (_req, res) => {
    const studios = await getStudios();
    const featured = await studios
      .find({})
      .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
      .limit(6)
      .toArray();

    res.status(200).json({
      success: true,
      message: "Featured studios loaded.",
      data: { studios: featured.map(toPublicStudio) },
    });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = studioQuerySchema.parse(req.query);
    const studios = await getStudios();

    const filter: Filter<StudioDoc> = {};

    if (query.category) {
      filter.category = query.category;
    }

    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [
        { title: pattern },
        { location: pattern },
        { overview: pattern },
        { amenities: pattern },
      ];
    }

    if (query.minRate !== undefined || query.maxRate !== undefined) {
      filter.hourlyRate = {
        ...(query.minRate !== undefined ? { $gte: query.minRate } : {}),
        ...(query.maxRate !== undefined ? { $lte: query.maxRate } : {}),
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [total, listings] = await Promise.all([
      studios.countDocuments(filter),
      studios
        .find(filter)
        .sort(sortMap[query.sort])
        .skip(skip)
        .limit(query.limit)
        .toArray(),
    ]);

    res.status(200).json({
      success: true,
      message: "Studios loaded.",
      data: {
        studios: listings.map(toPublicStudio),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
      },
    });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const studioId = parseObjectId(req.params.id ?? "", "studio");
    const studios = await getStudios();
    const studio = await studios.findOne({ _id: studioId });

    if (!studio) {
      throw new AppError(404, "Studio not found.", "STUDIO_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      message: "Studio loaded.",
      data: { studio: toPublicStudio(studio) },
    });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const input = createStudioSchema.parse(req.body);
    const studios = await getStudios();
    const now = new Date();

    const newStudio: NewStudio = {
      title: input.title,
      category: input.category,
      hourlyRate: input.hourlyRate,
      securityDeposit: input.securityDeposit,
      capacity: input.capacity,
      location: input.location,
      imageUrl: input.imageUrl,
      gallery: input.gallery.length > 0 ? input.gallery : [input.imageUrl],
      amenities: input.amenities,
      overview: input.overview,
      ownerEmail: user.email,
      ownerName: user.name,
      ownerPhoto: user.photoURL,
      rating: 0,
      reviewCount: 0,
      reviews: [],
      createdAt: now,
      updatedAt: now,
    };

    const studio: StudioDoc = { _id: new ObjectId(), ...newStudio };
    await studios.insertOne(studio);

    res.status(201).json({
      success: true,
      message: "Studio listing created successfully.",
      data: { studio: toPublicStudio(studio) },
    });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const studioId = parseObjectId(req.params.id ?? "", "studio");
    const input = updateStudioSchema.parse(req.body);
    const studios = await getStudios();

    const studio = await studios.findOne({ _id: studioId });
    if (!studio) {
      throw new AppError(404, "Studio not found.", "STUDIO_NOT_FOUND");
    }

    if (studio.ownerEmail !== user.email) {
      throw new AppError(
        403,
        "You can only update your own studio listings.",
        "STUDIO_OWNER_REQUIRED",
      );
    }

    const updated = await studios.findOneAndUpdate(
      { _id: studioId },
      {
        $set: {
          ...input,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updated) {
      throw new AppError(404, "Studio not found.", "STUDIO_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      message: "Studio listing updated successfully.",
      data: { studio: toPublicStudio(updated) },
    });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const studioId = parseObjectId(req.params.id ?? "", "studio");
    const studios = await getStudios();

    const studio = await studios.findOne({ _id: studioId });
    if (!studio) {
      throw new AppError(404, "Studio not found.", "STUDIO_NOT_FOUND");
    }

    if (studio.ownerEmail !== user.email) {
      throw new AppError(
        403,
        "You can only delete your own studio listings.",
        "STUDIO_OWNER_REQUIRED",
      );
    }

    await studios.deleteOne({ _id: studioId });

    res.status(200).json({
      success: true,
      message: "Studio listing deleted successfully.",
      data: { id: studioId.toHexString() },
    });
  }),
);

export default router;
