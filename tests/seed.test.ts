import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

let mongo: MongoMemoryServer;
let app: Express;

type MongoModule = typeof import("../src/db/mongo");

let mongoModule: MongoModule;

function cookieFrom(response: request.Response): string {
  const raw = response.headers["set-cookie"];
  if (!raw) {
    throw new Error("Expected an auth cookie in the response.");
  }

  const first = Array.isArray(raw) ? raw[0] : raw;
  return first.split(";")[0] ?? "";
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { dbName: "studiospace_seed_test" },
  });

  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = mongo.getUri("studiospace_seed_test");
  process.env.MONGODB_DB = "studiospace_seed_test";
  process.env.JWT_SECRET =
    "seed-test-secret-that-is-long-enough-for-hs256";

  const { createApp } = await import("../src/app");
  const { seedDatabase } = await import("../src/scripts/seed-database");

  mongoModule = await import("../src/db/mongo");
  await mongoModule.connectDB();
  await seedDatabase({ log: false });

  app = createApp();
}, 180_000);

afterAll(async () => {
  await mongoModule.closeDB();
  await mongo.stop();
});

describe("Seed database", () => {
  it("creates the demo users, studios, bookings, and wishlist entries", async () => {
    const users = await mongoModule.getUsers();
    const studios = await mongoModule.getStudios();
    const bookings = await mongoModule.getBookings();
    const wishlists = await mongoModule.getWishlists();

    expect(await users.countDocuments()).toBe(2);
    expect(await studios.countDocuments()).toBe(15);
    expect(await bookings.countDocuments()).toBe(4);
    expect(await wishlists.countDocuments()).toBe(2);

    const statuses = await bookings
      .find({})
      .sort({ date: 1 })
      .toArray();
    expect(new Set(statuses.map((booking) => booking.status))).toEqual(
      new Set(["Pending", "Confirmed", "Completed", "Cancelled"]),
    );

    const featured = await studios
      .find({})
      .sort({ rating: -1, reviewCount: -1 })
      .limit(6)
      .toArray();
    expect(featured).toHaveLength(6);
    expect(featured[0]?.rating).toBeGreaterThanOrEqual(
      featured[5]?.rating ?? 0,
    );
  });

  it("is idempotent when run again", async () => {
    const { seedDatabase } = await import("../src/scripts/seed-database");
    await seedDatabase({ log: false });

    const studios = await mongoModule.getStudios();
    const bookings = await mongoModule.getBookings();

    expect(await studios.countDocuments()).toBe(15);
    expect(await bookings.countDocuments()).toBe(4);
  });

  it("can sign in with both examiner accounts", async () => {
    const hostLogin = await request(app).post("/api/auth/login").send({
      email: "host@studiospace.com",
      password: "Studio123",
    });
    expect(hostLogin.status).toBe(200);
    expect(hostLogin.body.data.user.name).toBe("Maya Chen");

    const guestLogin = await request(app).post("/api/auth/login").send({
      email: "creator@studiospace.com",
      password: "Studio123",
    });
    expect(guestLogin.status).toBe(200);
    expect(guestLogin.body.data.user.name).toBe("Alex Rivera");

    const wrongPassword = await request(app).post("/api/auth/login").send({
      email: "host@studiospace.com",
      password: "Wrong123",
    });
    expect(wrongPassword.status).toBe(401);
  });

  it("serves seeded studios and the guest's bookings", async () => {
    const studiosResponse = await request(app).get(
      "/api/studios?limit=24",
    );
    expect(studiosResponse.status).toBe(200);
    expect(studiosResponse.body.data.pagination.total).toBe(15);

    const featuredResponse = await request(app).get(
      "/api/studios/featured",
    );
    expect(featuredResponse.status).toBe(200);
    expect(featuredResponse.body.data.studios).toHaveLength(6);

    const login = await request(app).post("/api/auth/login").send({
      email: "creator@studiospace.com",
      password: "Studio123",
    });
    const cookie = cookieFrom(login);

    const bookingsResponse = await request(app)
      .get("/api/bookings/mine")
      .set("Cookie", cookie);

    expect(bookingsResponse.status).toBe(200);
    expect(bookingsResponse.body.data.bookings).toHaveLength(4);
    expect(
      new Set(
        bookingsResponse.body.data.bookings.map(
          (booking: { status: string }) => booking.status,
        ),
      ),
    ).toEqual(
      new Set(["Pending", "Confirmed", "Completed", "Cancelled"]),
    );
  });
});
