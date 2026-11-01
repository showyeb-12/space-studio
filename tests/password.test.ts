import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password";

describe("password hashing", () => {
  it("hashes a password without storing the plain value", async () => {
    const hash = await hashPassword("Studio123");
    expect(hash).not.toBe("Studio123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("Studio123");
    await expect(verifyPassword("Studio123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Studio123");
    await expect(verifyPassword("Wrong123", hash)).resolves.toBe(false);
  });
});
