import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getEnv } from "../server/env";

type Database = NodePgDatabase<typeof schema>;

const fallbackDatabaseUrl =
  "postgres://postgres:postgres@127.0.0.1:5432/shopify_order_ops";

const globalForDb = globalThis as typeof globalThis & {
  orderOpsPool?: Pool;
  orderOpsDb?: Database;
};

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const hasAppSecrets =
    process.env.APP_PASSWORD &&
    process.env.APP_SESSION_SECRET &&
    process.env.INTERNAL_CRON_SECRET &&
    process.env.OPENCLAW_API_KEY &&
    process.env.SHOPIFY_STORES_JSON;

  return hasAppSecrets ? getEnv().databaseUrl : fallbackDatabaseUrl;
}

function createPool() {
  return new Pool({
    connectionString: resolveDatabaseUrl(),
  });
}

export const pool = globalForDb.orderOpsPool ?? createPool();

export const db = globalForDb.orderOpsDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.orderOpsPool = pool;
  globalForDb.orderOpsDb = db;
}

export type { Database };
