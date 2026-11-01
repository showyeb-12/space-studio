import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ObjectId } from "mongodb";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import type { StudioCategory } from "../src/constants/studios";
import type { StudioDoc } from "../src/types/models";

let mongo: MongoMemoryServer;
let app: Express;
let hostCookie = "";
let otherCookie = "";
let studioId = "";

const host = {
  name: "Maya Chen",
  email: "host@studiospace.com",
  password: "Studio123",
};

const other = {
  name: "Alex Rivera",
  email: "creator@studiospace.com",
  password: "Studio123",
};

const studioPayload = {
  title: "Sunset Cyc Studio",
  category: "Photo Studio",
  hourlyRate: 85,
  securityDeposit: 200,
  capacity: 8,
  location: "12 Backlot Avenue, Los Angeles, CA",
  imageUrl:
    "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1200&q=80",
  amenities: ["Cyc Wall", "Lighting Rig", "Green Room"],
  overview:
    "A sunlit photo studio with a full cyclorama wall, dedicated lighting grid, and a private green room for talent.",
  ownerEmail: "attacker@example.com",
};

function seedStudio(input: {
  title: string;
  category: StudioCategory;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
}): StudioDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    title: input.title,
    category: input.category,
    hourlyRate: input.hourlyRate,
    securityDeposit: 100,
    capacity: 10,
    location: "Sound Stage Row, Los Angeles, CA",
    imageUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
    gallery: [],
    amenities: ["Parking", "Wi-Fi"],
    overview:
      "A professionally equipped creative space prepared for productions, recordings, and workshops.",
    ownerEmail: "seed@studiospace.com",
    ownerName: "Seed Host",
    ownerPhoto: null,
    rating: input.rating,
    reviewCount: input.reviewCount,
    reviews: [],
    createdAt: now,
    updatedAt: now,
  };
}

const seedStudios: StudioDoc[] = [
  seedStudio({
    title: "Neon Film Stage",
    category: "Film Stage",
    hourlyRate: 120,
    rating: 5,
    reviewCount: 18,
  }),
  seedStudio({
    title: "Quiet Podcast Lounge",
    category: "Podcast Lounge",
    hourlyRate: 45,
    rating: 4.7,
    reviewCount: 9,
  }),
  seedStudio({
    title: "Analog Music Suite",
    category: "Music Suite",
    hourlyRate: 70,
    rating: 4.9,
    reviewCount: 14,
  }),
  seedStudio({
    title: "Makers Art Workshop",
    category: "Workshop",
    hourlyRate: 60,
    rating: 4.6,
    reviewCount: 7,
  }),
  seedStudio({
    title: "Daylight Photo Studio",
    category: "Photo Studio",
    hourlyRate: 90,
    rating: 4.8,
    reviewCount: 22,
  }),
  seedStudio({
    title: "Soundstage 7",
    category: "Film Stage",
    hourlyRate: 150,
    rating: 4.5,
    reviewCount: 11,
  }),
  seedStudio({
    title: "Brick Loft Studio",
    category: "Photo Studio",
    hourlyRate: 80,
    rating: 5,
    reviewCount: 16,
  }),
];

function cookieFrom(response: request.Response): string {
  const raw = response.headers["set-cookie"];
  if (!raw) {
    throw new Error("Expected an auth cookie in the response.");
  }

  const first = Array.isArray(raw) ? raw[0] : raw;
  return first.split(";")[0] ?? "";
}

async function register(user: typeof host): Promise<void> {
  const response = await request(app)
    .post("/api/auth/register")
    .send(user);
  expect(response.status).toBe(201);
}

async function login(email: string): Promise<string> {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Studio123" });
  expect(response.status).toBe(200);
  return cookieFrom(response);
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { dbName: "studiospace_test" },
  });

  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = mongo.getUri("studiospace_test");
  process.env.MONGODB_DB = "studiospace_test";
  process.env.JWT_SECRET =
    "integration-test-secret-that-is-long-enough-for-hs256";

  const { createApp } = await import("../src/app");
  const { connectDB, getStudios } = await import("../src/db/mongo");

  await connectDB();
  await (await getStudios()).insertMany(seedStudios);
  app = createApp();

  await register(host);
  await register(other);

  hostCookie = await login(host.email);
  otherCookie = await login(other.email);
}, 180_000);

afterAll(async () => {
  const { closeDB } = await import("../src/db/mongo");
  await closeDB();
  await mongo.stop();
});

const bookingDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

describe("Studio CRUD", () => {
  it("rejects studio creation without an auth cookie", async () => {
    const response = await request(app)
      .post("/api/studios")
      .send(studioPayload);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("creates a studio with owner identity from the JWT", async () => {
    const response = await request(app)
      .post("/api/studios")
      .set("Cookie", hostCookie)
      .send(studioPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.studio.owner.email).toBe(host.email);
    expect(response.body.data.studio.owner.name).toBe(host.name);
    expect(response.body.data.studio.rating).toBe(0);
    expect(response.body.data.studio.reviewCount).toBe(0);
    expect(response.body.data.studio.gallery).toEqual([
      studioPayload.imageUrl,
    ]);
    expect(response.body.data.studio.amenities).toEqual(
      studioPayload.amenities,
    );

    studioId = response.body.data.studio.id;
    expect(studioId).toMatch(/^[a-f0-9]{24}$/);
  });

  it("loads a studio publicly by id", async () => {
    const response = await request(app).get(`/api/studios/${studioId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.studio.title).toBe(studioPayload.title);
  });

  it("returns the owner's listings", async () => {
    const response = await request(app)
      .get("/api/studios/mine")
      .set("Cookie", hostCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.studios).toHaveLength(1);
    expect(response.body.data.studios[0].id).toBe(studioId);
  });

  it("lists studios with pagination", async () => {
    const response = await request(app).get(
      "/api/studios?page=1&limit=3&sort=newest",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.studios).toHaveLength(3);
    expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(8);
    expect(response.body.data.pagination.page).toBe(1);
    expect(response.body.data.pagination.limit).toBe(3);
  });

  it("filters studios by category and price", async () => {
    const categoryResponse = await request(app).get(
      "/api/studios?category=Film%20Stage",
    );

    expect(categoryResponse.status).toBe(200);
    expect(categoryResponse.body.data.studios.length).toBeGreaterThanOrEqual(
      2,
    );
    for (const studio of categoryResponse.body.data.studios) {
      expect(studio.category).toBe("Film Stage");
    }

    const priceResponse = await request(app).get(
      "/api/studios?minRate=60&maxRate=90",
    );

    expect(priceResponse.status).toBe(200);
    for (const studio of priceResponse.body.data.studios) {
      expect(studio.hourlyRate).toBeGreaterThanOrEqual(60);
      expect(studio.hourlyRate).toBeLessThanOrEqual(90);
    }
  });

  it("searches studio titles", async () => {
    const response = await request(app).get("/api/studios?search=Neon");

    expect(response.status).toBe(200);
    expect(response.body.data.studios).toHaveLength(1);
    expect(response.body.data.studios[0].title).toBe("Neon Film Stage");
  });

  it("sorts studios by price ascending", async () => {
    const response = await request(app).get(
      "/api/studios?sort=price-asc&limit=24",
    );

    expect(response.status).toBe(200);
    const rates = response.body.data.studios.map(
      (studio: { hourlyRate: number }) => studio.hourlyRate,
    );
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
  });

  it("returns exactly six top-rated featured studios", async () => {
    const response = await request(app).get("/api/studios/featured");

    expect(response.status).toBe(200);
    expect(response.body.data.studios).toHaveLength(6);

    const ratings = response.body.data.studios.map(
      (studio: { rating: number }) => studio.rating,
    );
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    expect(ratings[0]).toBe(5);
  });

  it("rejects invalid list filters", async () => {
    const response = await request(app).get(
      "/api/studios?minRate=200&maxRate=50",
    );

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");

    const sortResponse = await request(app).get(
      "/api/studios?sort=cheapest",
    );
    expect(sortResponse.status).toBe(400);
  });

  it("updates an owned studio", async () => {
    const response = await request(app)
      .patch(`/api/studios/${studioId}`)
      .set("Cookie", hostCookie)
      .send({ title: "Sunset Cyc Studio Deluxe", hourlyRate: 95 });

    expect(response.status).toBe(200);
    expect(response.body.data.studio.title).toBe(
      "Sunset Cyc Studio Deluxe",
    );
    expect(response.body.data.studio.hourlyRate).toBe(95);
  });

  it("prevents another user from updating the studio", async () => {
    const response = await request(app)
      .patch(`/api/studios/${studioId}`)
      .set("Cookie", otherCookie)
      .send({ title: "Hijacked Studio" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("STUDIO_OWNER_REQUIRED");
  });

  it("prevents another user from deleting the studio", async () => {
    const response = await request(app)
      .delete(`/api/studios/${studioId}`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("STUDIO_OWNER_REQUIRED");
  });

  it("rejects invalid upload file types", async () => {
    const response = await request(app)
      .post("/api/uploads")
      .set("Cookie", hostCookie)
      .attach("image", Buffer.from("not really an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_IMAGE_TYPE");
  });

  it("reports image uploads as unconfigured when no ImgBB key is set", async () => {
    const response = await request(app)
      .post("/api/uploads")
      .set("Cookie", hostCookie)
      .attach("image", Buffer.from("fake png bytes"), {
        filename: "studio.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("UPLOAD_NOT_CONFIGURED");
  });

  it("validates studio numbers and enums", async () => {
    const response = await request(app)
      .post("/api/studios")
      .set("Cookie", hostCookie)
      .send({
        ...studioPayload,
        category: "Secret Bunker",
        hourlyRate: -10,
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects malformed studio ids", async () => {
    const response = await request(app).get("/api/studios/not-an-id");
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_OBJECT_ID");
  });

  it("deletes an owned studio", async () => {
    const response = await request(app)
      .delete(`/api/studios/${studioId}`)
      .set("Cookie", hostCookie);

    expect(response.status).toBe(200);

    const check = await request(app).get(`/api/studios/${studioId}`);
    expect(check.status).toBe(404);
  });
});

describe("Booking flow", () => {
  const bookingStudioId = seedStudios[0]?._id.toHexString() ?? "";
  let bookingId = "";
  let adjacentBookingId = "";
  let rebookedId = "";

  const baseBooking = {
    studioId: bookingStudioId,
    date: bookingDate,
    startTime: "10:00",
    endTime: "12:00",
    note: "Need a lighting assistant for the first hour.",
  };

  it("rejects booking without authentication", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .send(baseBooking);

    expect(response.status).toBe(401);
  });

  it("creates a pending booking with server-calculated totals", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .set("Cookie", otherCookie)
      .send(baseBooking);

    expect(response.status).toBe(201);
    expect(response.body.data.booking.status).toBe("Pending");
    expect(response.body.data.booking.guestEmail).toBe(other.email);
    expect(response.body.data.booking.hours).toBe(2);
    expect(response.body.data.booking.totalPrice).toBe(240);
    expect(response.body.data.booking.studioTitle).toBe("Neon Film Stage");

    bookingId = response.body.data.booking.id;
  });

  it("rejects an overlapping booking", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .set("Cookie", otherCookie)
      .send({ ...baseBooking, startTime: "11:00", endTime: "13:00" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("BOOKING_CONFLICT");
    expect(response.body.message).toMatch(/already reserved/i);
  });

  it("allows a back-to-back booking without overlap", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .set("Cookie", otherCookie)
      .send({ ...baseBooking, startTime: "12:00", endTime: "13:00" });

    expect(response.status).toBe(201);
    adjacentBookingId = response.body.data.booking.id;
  });

  it("returns the guest's bookings", async () => {
    const response = await request(app)
      .get("/api/bookings/mine")
      .set("Cookie", otherCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.bookings.length).toBeGreaterThanOrEqual(2);
    expect(
      response.body.data.bookings.map(
        (booking: { id: string }) => booking.id,
      ),
    ).toContain(bookingId);
  });

  it("prevents another user from cancelling the booking", async () => {
    const response = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Cookie", hostCookie);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("BOOKING_OWNER_REQUIRED");
  });

  it("cancels a pending booking", async () => {
    const response = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.booking.status).toBe("Cancelled");
    expect(response.body.data.booking.cancelledAt).toBeTruthy();
  });

  it("frees the cancelled slot for a new booking", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .set("Cookie", otherCookie)
      .send(baseBooking);

    expect(response.status).toBe(201);
    rebookedId = response.body.data.booking.id;
  });

  it("rejects cancelling an already cancelled booking", async () => {
    const response = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("BOOKING_NOT_CANCELLABLE");
  });

  it("validates booking dates, times, and studios", async () => {
    const past = await request(app)
      .post("/api/bookings")
      .set("Cookie", otherCookie)
      .send({
        ...baseBooking,
        date: "2020-01-01",
      });
    expect(past.status).toBe(400);

    const reversed = await request(app)
      .post("/api/bookings")
      .set("Cookie", otherCookie)
      .send({ ...baseBooking, startTime: "14:00", endTime: "13:00" });
    expect(reversed.status).toBe(400);

    const missingStudio = await request(app)
      .post("/api/bookings")
      .set("Cookie", otherCookie)
      .send({
        ...baseBooking,
        studioId: new ObjectId().toHexString(),
        startTime: "15:00",
        endTime: "16:00",
      });
    expect(missingStudio.status).toBe(404);
  });

  it("cancels the rebooked reservation", async () => {
    const response = await request(app)
      .patch(`/api/bookings/${rebookedId}/cancel`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.booking.status).toBe("Cancelled");

    const adjacent = await request(app)
      .patch(`/api/bookings/${adjacentBookingId}/cancel`)
      .set("Cookie", otherCookie);
    expect(adjacent.status).toBe(200);
  });
});

describe("Saved studios wishlist", () => {
  const savedStudioId = seedStudios[1]?._id.toHexString() ?? "";

  it("requires authentication", async () => {
    const response = await request(app).get("/api/wishlist/ids");
    expect(response.status).toBe(401);
  });

  it("starts empty for a new user", async () => {
    const response = await request(app)
      .get("/api/wishlist/ids")
      .set("Cookie", hostCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.studioIds).toEqual([]);
  });

  it("toggles a studio into the wishlist", async () => {
    const save = await request(app)
      .post(`/api/wishlist/${savedStudioId}`)
      .set("Cookie", hostCookie);

    expect(save.status).toBe(200);
    expect(save.body.data.saved).toBe(true);

    const ids = await request(app)
      .get("/api/wishlist/ids")
      .set("Cookie", hostCookie);
    expect(ids.body.data.studioIds).toContain(savedStudioId);

    const list = await request(app)
      .get("/api/wishlist")
      .set("Cookie", hostCookie);
    expect(list.status).toBe(200);
    expect(
      list.body.data.studios.map((studio: { id: string }) => studio.id),
    ).toContain(savedStudioId);
  });

  it("keeps wishlists private per user", async () => {
    const response = await request(app)
      .get("/api/wishlist/ids")
      .set("Cookie", otherCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.studioIds).toEqual([]);
  });

  it("toggles the studio back out of the wishlist", async () => {
    const remove = await request(app)
      .post(`/api/wishlist/${savedStudioId}`)
      .set("Cookie", hostCookie);

    expect(remove.status).toBe(200);
    expect(remove.body.data.saved).toBe(false);

    const ids = await request(app)
      .get("/api/wishlist/ids")
      .set("Cookie", hostCookie);
    expect(ids.body.data.studioIds).toEqual([]);
  });

  it("validates the studio id", async () => {
    const malformed = await request(app)
      .post("/api/wishlist/not-an-id")
      .set("Cookie", hostCookie);
    expect(malformed.status).toBe(400);

    const missing = await request(app)
      .post(`/api/wishlist/${new ObjectId().toHexString()}`)
      .set("Cookie", hostCookie);
    expect(missing.status).toBe(404);
  });
});
