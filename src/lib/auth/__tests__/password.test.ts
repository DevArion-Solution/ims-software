import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies bcrypt passwords", async () => {
    const hash = await hashPassword("secret123");
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects legacy plain-text after migration", async () => {
    expect(await verifyPassword("plain", "plain")).toBe(true);
    expect(await verifyPassword("other", "plain")).toBe(false);
  });
});
