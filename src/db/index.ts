import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

const fallbackDatabaseUrl =
  "postgres://postgres:postgres@127.0.0.1:5432/shopify_order_ops";

const globalForDb = globalThis as typeof globalThis & {
  orderOpsPool?: Pool;
  orderOpsDb?: Database;
};

export function resolveDatabaseUrl(input: Record<string, string | undefined> = process.env) {
  return input.DATABASE_URL ?? fallbackDatabaseUrl;
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
