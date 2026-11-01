import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Choose a valid studio.")
  .transform((value) => value.toLowerCase());

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid booking date.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Choose a valid booking date.")
  .refine(
    (value) =>
      new Date(`${value}T23:59:59.999Z`).getTime() >= Date.now(),
    "Booking date cannot be in the past.",
  );

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid 24-hour time.");

export const createBookingSchema = z
  .object({
    studioId: objectIdSchema,
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    note: z
      .string()
      .trim()
      .max(500, "Notes must be 500 characters or fewer.")
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .superRefine((value, ctx) => {
    const start = timeToMinutes(value.startTime);
    const end = timeToMinutes(value.endTime);

    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be later than the start time.",
      });
      return;
    }

    const duration = end - start;
    if (duration < 30) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Bookings must be at least 30 minutes long.",
      });
    }

    if (duration > 12 * 60) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Bookings cannot exceed 12 hours.",
      });
    }
  });

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
