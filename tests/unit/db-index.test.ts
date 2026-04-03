import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/db";

describe("resolveDatabaseUrl", () => {
  it("uses DATABASE_URL when it is available", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgres://example.test/app",
      }),
    ).toBe("postgres://example.test/app");
  });

  it("falls back cleanly when DATABASE_URL is missing even if other app env vars exist", () => {
    expect(
      resolveDatabaseUrl({
        APP_PASSWORD: "secret",
        APP_SESSION_SECRET: "12345678901234567890123456789012",
        INTERNAL_CRON_SECRET: "cron-secret",
        OPENCLAW_API_KEY: "openclaw",
        SHOPIFY_STORES_JSON: "[]",
      }),
    ).toBe("postgres://postgres:postgres@127.0.0.1:5432/shopify_order_ops");
  });
});
