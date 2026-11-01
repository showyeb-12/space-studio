import { Router } from "express";
import { ObjectId } from "mongodb";
import { getBookings, getStudios } from "../db/mongo";
import { requireAuth } from "../middleware/requireAuth";
import {
  createBookingSchema,
  timeToMinutes,
} from "../schemas/booking.schema";
import {
  toPublicBooking,
  type BookingDoc,
  type NewBooking,
} from "../types/models";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getAuthUser } from "../utils/auth";
import { parseObjectId } from "../utils/objectId";

const router = Router();

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const bookings = await getBookings();

    const reservations = await bookings
      .find({ guestEmail: user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Your bookings were loaded.",
      data: { bookings: reservations.map(toPublicBooking) },
    });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const input = createBookingSchema.parse(req.body);

    const studios = await getStudios();
    const studio = await studios.findOne({
      _id: new ObjectId(input.studioId),
    });

    if (!studio) {
      throw new AppError(404, "Studio not found.", "STUDIO_NOT_FOUND");
    }

    const bookings = await getBookings();

    const conflict = await bookings.findOne({
      studioId: studio._id,
      date: input.date,
      status: { $in: ["Confirmed", "Pending"] },
      startTime: { $lt: input.endTime },
      endTime: { $gt: input.startTime },
    });

    if (conflict) {
      throw new AppError(
        409,
        "This studio is already reserved for part of that time. Choose another slot.",
        "BOOKING_CONFLICT",
      );
    }

    const durationMinutes =
      timeToMinutes(input.endTime) - timeToMinutes(input.startTime);
    const hours = Math.round((durationMinutes / 60) * 100) / 100;
    const totalPrice =
      Math.round(hours * studio.hourlyRate * 100) / 100;
    const now = new Date();

    const newBooking: NewBooking = {
      studioId: studio._id,
      studioTitle: studio.title,
      studioImage: studio.imageUrl,
      ownerEmail: studio.ownerEmail,
      guestEmail: user.email,
      guestName: user.name,
      guestPhoto: user.photoURL,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      hours,
      totalPrice,
      securityDeposit: studio.securityDeposit,
      note: input.note,
      status: "Pending",
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    };

    const booking: BookingDoc = {
      _id: new ObjectId(),
      ...newBooking,
    };

    await bookings.insertOne(booking);

    res.status(201).json({
      success: true,
      message: "Booking requested successfully. Waiting for host confirmation.",
      data: { booking: toPublicBooking(booking) },
    });
  }),
);

router.patch(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const bookingId = parseObjectId(req.params.id ?? "", "booking");
    const bookings = await getBookings();

    const booking = await bookings.findOne({ _id: bookingId });
    if (!booking) {
      throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    }

    if (booking.guestEmail !== user.email) {
      throw new AppError(
        403,
        "You can only cancel your own bookings.",
        "BOOKING_OWNER_REQUIRED",
      );
    }

    if (booking.status !== "Pending") {
      throw new AppError(
        409,
        "Only pending bookings can be cancelled.",
        "BOOKING_NOT_CANCELLABLE",
      );
    }

    const updated = await bookings.findOneAndUpdate(
      { _id: bookingId },
      {
        $set: {
          status: "Cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updated) {
      throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      data: { booking: toPublicBooking(updated) },
    });
  }),
);

export default router;
