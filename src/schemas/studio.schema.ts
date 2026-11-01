import { z } from "zod";
import {
  STUDIO_CATEGORIES,
  type StudioCategory,
} from "../constants/studios";

const httpUrl = z
  .string()
  .trim()
  .url("Enter a valid image URL.")
  .max(1000, "Image URLs must be 1000 characters or fewer.")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Image URL must start with http:// or https://.",
  });

const amenitiesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(2, "Amenity names must be at least 2 characters.")
      .max(60, "Amenity names must be 60 characters or fewer."),
  )
  .max(20, "You can add up to 20 amenities.")
  .transform((items) => Array.from(new Set(items.filter(Boolean))));

const gallerySchema = z
  .array(httpUrl)
  .max(8, "You can add up to 8 gallery images.");

const studioFields = {
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(120, "Title must be 120 characters or fewer."),
  category: z.enum(
    [...STUDIO_CATEGORIES] as [StudioCategory, ...StudioCategory[]],
    { message: "Choose a valid studio category." },
  ),
  hourlyRate: z.coerce
    .number()
    .positive("Hourly rate must be greater than 0.")
    .max(100_000, "Hourly rate is too high."),
  securityDeposit: z.coerce
    .number()
    .nonnegative("Security deposit cannot be negative.")
    .max(1_000_000, "Security deposit is too high."),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number.")
    .min(1, "Capacity must be at least 1.")
    .max(5_000, "Capacity is too high."),
  location: z
    .string()
    .trim()
    .min(3, "Location must be at least 3 characters.")
    .max(200, "Location must be 200 characters or fewer."),
  imageUrl: httpUrl,
  gallery: gallerySchema,
  amenities: amenitiesSchema,
  overview: z
    .string()
    .trim()
    .min(20, "Overview must be at least 20 characters.")
    .max(4_000, "Overview must be 4,000 characters or fewer."),
};

export const createStudioSchema = z.object({
  ...studioFields,
  gallery: gallerySchema.default([]),
  amenities: amenitiesSchema.default([]),
});

export const updateStudioSchema = z
  .object(studioFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const STUDIO_SORTS = [
  "newest",
  "rating",
  "price-asc",
  "price-desc",
] as const;

export type StudioSort = (typeof STUDIO_SORTS)[number];

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalSearch = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(100).optional(),
);

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().nonnegative().optional(),
);

export const studioQuerySchema = z
  .object({
    category: z.preprocess(
      emptyToUndefined,
      z
        .enum(
          [...STUDIO_CATEGORIES] as [StudioCategory, ...StudioCategory[]],
          { message: "Choose a valid studio category." },
        )
        .optional(),
    ),
    search: optionalSearch,
    minRate: optionalNumber,
    maxRate: optionalNumber,
    sort: z.preprocess(
      emptyToUndefined,
      z.enum(STUDIO_SORTS).default("newest"),
    ),
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).default(1),
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(24).default(12),
    ),
  })
  .refine(
    (value) =>
      value.minRate === undefined ||
      value.maxRate === undefined ||
      value.minRate <= value.maxRate,
    {
      message: "Minimum rate cannot be greater than maximum rate.",
      path: ["minRate"],
    },
  );

export type StudioQueryInput = z.infer<typeof studioQuerySchema>;

export type CreateStudioInput = z.infer<typeof createStudioSchema>;
export type UpdateStudioInput = z.infer<typeof updateStudioSchema>;
