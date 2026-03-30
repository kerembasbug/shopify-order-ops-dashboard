import { describe, expect, it } from "vitest";
import { parseEnv } from "@/server/env";

describe("parseEnv", () => {
  it("rejects missing required secrets", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://localhost:5432/order_ops",
        APP_PASSWORD: "secret",
        OPENCLAW_API_KEY: "oc_test",
        SHOPIFY_STORES_JSON: "[]",
      }),
    ).toThrow(/APP_SESSION_SECRET/);
  });

  it("parses configured stores", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://localhost:5432/order_ops",
      APP_PASSWORD: "secret",
      APP_SESSION_SECRET: "12345678901234567890123456789012",
      INTERNAL_CRON_SECRET: "cron_secret",
      OPENCLAW_API_KEY: "oc_test",
      SHOPIFY_STORES_JSON:
        '[{"key":"robot-arm","name":"DIY Robotic Arm","domain":"robot-arm.myshopify.com","adminToken":"shpat_test"}]',
    });

    expect(env.shopifyStores).toHaveLength(1);
    expect(env.shopifyStores[0].key).toBe("robot-arm");
  });
});
