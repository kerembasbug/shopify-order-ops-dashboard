import { defineConfig } from "drizzle-kit";

const fallbackDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5432/shopify_order_ops";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: fallbackDatabaseUrl,
  },
  strict: true,
  verbose: true,
});
