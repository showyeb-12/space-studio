import { describe, expect, it } from "vitest";
import {
  googleSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
} from "../src/schemas/auth.schema";

describe("passwordSchema", () => {
  it("accepts a password with uppercase, lowercase, and 6+ characters", () => {
    expect(passwordSchema.safeParse("Studio123").success).toBe(true);
  });

  it("rejects a password without an uppercase letter", () => {
    const result = passwordSchema.safeParse("studio123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/uppercase/i);
    }
  });

  it("rejects a password without a lowercase letter", () => {
    const result = passwordSchema.safeParse("STUDIO123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/lowercase/i);
    }
  });

  it("rejects a password shorter than 6 characters", () => {
    const result = passwordSchema.safeParse("Aa1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/6 characters/i);
    }
  });
});

describe("registerSchema", () => {
  it("normalizes email and optional photo URL", () => {
    const parsed = registerSchema.parse({
      name: "  Maya Chen ",
      email: "  MAYA@StudioSpace.COM ",
      password: "Studio123",
      photoURL: "",
    });

    expect(parsed.name).toBe("Maya Chen");
    expect(parsed.email).toBe("maya@studiospace.com");
    expect(parsed.photoURL).toBeNull();
  });

  it("rejects an invalid photo URL", () => {
    const result = registerSchema.safeParse({
      name: "Maya Chen",
      email: "maya@studiospace.com",
      password: "Studio123",
      photoURL: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("trims and lowercases login email", () => {
    const parsed = loginSchema.parse({
      email: "  USER@EXAMPLE.COM ",
      password: "Studio123",
    });
    expect(parsed.email).toBe("user@example.com");
  });
});

describe("googleSchema", () => {
  it("requires a credential", () => {
    expect(googleSchema.safeParse({ credential: "short" }).success).toBe(false);
    expect(
      googleSchema.safeParse({ credential: "a-valid-looking-credential" })
        .success,
    ).toBe(true);
  });
});
