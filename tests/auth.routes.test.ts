import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();

describe("StudioSpace API shell", () => {
  it("responds on the root route", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.health).toBe("/api/health");
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("blocks unknown CORS origins", async () => {
    const response = await request(app)
      .get("/")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CORS_BLOCKED");
  });
});

describe("auth route guards", () => {
  it("rejects /api/auth/me without a token", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("rejects /api/auth/me with an invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "ss_token=not-a-real-token");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_SESSION");
  });

  it("validates registration fields before touching the database", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Maya Chen",
      email: "maya@studiospace.com",
      password: "weak",
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.message).toMatch(/6 characters/i);
  });

  it("validates login fields before touching the database", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "Studio123" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("reports Google sign-in as unconfigured when no client ID is set", async () => {
    const response = await request(app)
      .post("/api/auth/google")
      .send({ credential: "a-valid-looking-google-credential" });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("GOOGLE_NOT_CONFIGURED");
  });

  it("protects the image upload endpoint", async () => {
    const response = await request(app).post("/api/uploads");
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("clears the auth cookie on logout", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers["set-cookie"]?.[0]).toContain("ss_token=");
  });
});
