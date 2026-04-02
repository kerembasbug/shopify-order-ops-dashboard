import fs from "node:fs";
import { defineConfig } from "@playwright/test";

const preferredExecutables = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
];
const preferredExecutablePath = preferredExecutables.find((path) => fs.existsSync(path));

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "/tmp/shopify-order-ops-dashboard-playwright",
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    launchOptions: preferredExecutablePath
      ? {
          executablePath: preferredExecutablePath,
        }
      : undefined,
  },
  webServer: {
    command:
      "DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/shopify_order_ops APP_PASSWORD=secret-password APP_SESSION_SECRET=12345678901234567890123456789012 INTERNAL_CRON_SECRET=cron-secret OPENCLAW_API_KEY=openclaw-secret SHOPIFY_STORES_JSON='[{\"key\":\"robot-arm\",\"name\":\"DIY Robotic Arm\",\"domain\":\"robot-arm.myshopify.com\",\"adminToken\":\"shpat_test\"}]' pnpm dev --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
