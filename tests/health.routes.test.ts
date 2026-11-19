import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let mongo: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = "studiospace-health-test";

  const { connectDB } = await import("../src/db/mongo");
  await connectDB();

  const { createApp } = await import("../src/app");
  app = createApp();
});

afterAll(async () => {
  const { closeDB } = await import("../src/db/mongo");
  await closeDB();
  if (mongo) {
    await mongo.stop();
  }
});

describe("GET /api/health", () => {
  it("returns database connectivity status and uptime", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.database).toBe("connected");
    expect(typeof response.body.data.uptimeSeconds).toBe("number");
  });
});
