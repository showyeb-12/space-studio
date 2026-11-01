import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { authCookieOptions } from "../src/lib/cookies";
import { signAuthToken, verifyAuthToken } from "../src/lib/jwt";

describe("JWT auth token", () => {
  it("signs and verifies the expected payload", () => {
    const token = signAuthToken({
      sub: "6512b2f4c2f1a2b3c4d5e6f7",
      email: "maya@studiospace.com",
      name: "Maya Chen",
      photoURL: "https://example.com/maya.jpg",
    });

    const payload = verifyAuthToken(token);

    expect(payload.sub).toBe("6512b2f4c2f1a2b3c4d5e6f7");
    expect(payload.email).toBe("maya@studiospace.com");
    expect(payload.name).toBe("Maya Chen");
    expect(payload.photoURL).toBe("https://example.com/maya.jpg");
  });

  it("rejects a tampered token", () => {
    const token = signAuthToken({
      sub: "6512b2f4c2f1a2b3c4d5e6f7",
      email: "maya@studiospace.com",
      name: "Maya Chen",
      photoURL: null,
    });

    expect(() => verifyAuthToken(`${token}tampered`)).toThrow();
  });

  it("rejects a token signed without the expected issuer", () => {
    const token = jwt.sign(
      { sub: "123", email: "a@b.com", name: "A" },
      env.JWT_SECRET,
    );

    expect(() => verifyAuthToken(token)).toThrow();
  });
});

describe("auth cookie options", () => {
  it("uses HTTPOnly and SameSite Lax", () => {
    expect(authCookieOptions.httpOnly).toBe(true);
    expect(authCookieOptions.sameSite).toBe("lax");
    expect(authCookieOptions.path).toBe("/");
    expect(authCookieOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
