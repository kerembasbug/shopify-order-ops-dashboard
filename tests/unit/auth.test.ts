import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/server/auth";

describe("auth session helpers", () => {
  it("creates and verifies the dashboard session token", async () => {
    const token = await createSessionToken("12345678901234567890123456789012");
    const session = await verifySessionToken(
      token,
      "12345678901234567890123456789012",
    );

    expect(session.sub).toBe("dashboard-user");
  });

  it("rejects a malformed token", async () => {
    await expect(
      verifySessionToken("broken-token", "12345678901234567890123456789012"),
    ).rejects.toThrow();
  });
});
