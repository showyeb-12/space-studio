import type { ObjectId } from "mongodb";
import type { BookingStatus } from "../constants/bookings";
import type { StudioCategory } from "../constants/studios";

export type AuthProvider = "credentials" | "google";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  photoURL: string | null;
  passwordHash: string | null;
  provider: AuthProvider;
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Omit<UserDoc, "_id">;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  provider: AuthProvider;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoURL: string | null;
}

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    photoURL: user.photoURL ?? null,
    provider: user.provider,
    createdAt: user.createdAt.toISOString(),
  };
}

export interface ReviewDoc {
  id: string;
  name: string;
  photoURL: string | null;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface StudioDoc {
  _id: ObjectId;
  title: string;
  category: StudioCategory;
  hourlyRate: number;
  securityDeposit: number;
  capacity: number;
  location: string;
  imageUrl: string;
  gallery: string[];
  amenities: string[];
  overview: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhoto: string | null;
  rating: number;
  reviewCount: number;
  reviews: ReviewDoc[];
  createdAt: Date;
  updatedAt: Date;
}

export type NewStudio = Omit<StudioDoc, "_id">;

export interface PublicReview {
  id: string;
  name: string;
  photoURL: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PublicStudio {
  id: string;
  title: string;
  category: StudioCategory;
  hourlyRate: number;
  securityDeposit: number;
  capacity: number;
  location: string;
  imageUrl: string;
  gallery: string[];
  amenities: string[];
  overview: string;
  owner: {
    email: string;
    name: string;
    photoURL: string | null;
  };
  rating: number;
  reviewCount: number;
  reviews: PublicReview[];
  createdAt: string;
  updatedAt: string;
}

export interface BookingDoc {
  _id: ObjectId;
  studioId: ObjectId;
  studioTitle: string;
  studioImage: string;
  ownerEmail: string;
  guestEmail: string;
  guestName: string;
  guestPhoto: string | null;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  totalPrice: number;
  securityDeposit: number;
  note: string | null;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

export type NewBooking = Omit<BookingDoc, "_id">;

export interface PublicBooking {
  id: string;
  studioId: string;
  studioTitle: string;
  studioImage: string;
  ownerEmail: string;
  guestEmail: string;
  guestName: string;
  guestPhoto: string | null;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  totalPrice: number;
  securityDeposit: number;
  note: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export function toPublicBooking(booking: BookingDoc): PublicBooking {
  return {
    id: booking._id.toHexString(),
    studioId: booking.studioId.toHexString(),
    studioTitle: booking.studioTitle,
    studioImage: booking.studioImage,
    ownerEmail: booking.ownerEmail,
    guestEmail: booking.guestEmail,
    guestName: booking.guestName,
    guestPhoto: booking.guestPhoto ?? null,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    hours: booking.hours,
    totalPrice: booking.totalPrice,
    securityDeposit: booking.securityDeposit,
    note: booking.note ?? null,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
  };
}

export function toPublicStudio(studio: StudioDoc): PublicStudio {
  return {
    id: studio._id.toHexString(),
    title: studio.title,
    category: studio.category,
    hourlyRate: studio.hourlyRate,
    securityDeposit: studio.securityDeposit,
    capacity: studio.capacity,
    location: studio.location,
    imageUrl: studio.imageUrl,
    gallery: studio.gallery,
    amenities: studio.amenities,
    overview: studio.overview,
    owner: {
      email: studio.ownerEmail,
      name: studio.ownerName,
      photoURL: studio.ownerPhoto ?? null,
    },
    rating: studio.rating,
    reviewCount: studio.reviewCount,
    reviews: studio.reviews.map((review) => ({
      id: review.id,
      name: review.name,
      photoURL: review.photoURL ?? null,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    })),
    createdAt: studio.createdAt.toISOString(),
    updatedAt: studio.updatedAt.toISOString(),
  };
}
