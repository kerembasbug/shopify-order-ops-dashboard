import { sql } from "drizzle-orm";
import { stores } from "@/db/schema";
import { getEnv, type ShopifyStore } from "@/server/env";

type StoreInsert = typeof stores.$inferInsert;
type StoreConflictUpdate = {
  target: typeof stores.key;
  set: Record<string, unknown>;
};

export type StoreBootstrapDb = {
  insert: (table: typeof stores) => {
    values: (values: StoreInsert[]) => {
      onConflictDoUpdate: (config: StoreConflictUpdate) => Promise<unknown>;
    };
  };
};

export type ConfiguredStoreRow = Pick<
  StoreInsert,
  "key" | "name" | "shopDomain" | "status"
>;

export function buildConfiguredStoreRows(
  configuredStores: ShopifyStore[],
): ConfiguredStoreRow[] {
  return configuredStores.map((store) => ({
    key: store.key,
    name: store.name,
    shopDomain: store.domain,
    status: "active",
  }));
}

function buildStoreUpsertRows(configuredStores: ShopifyStore[]): StoreInsert[] {
  return configuredStores.map((store) => ({
    key: store.key,
    name: store.name,
    shopDomain: store.domain,
    credentialsRef: store.key,
    status: "active",
  }));
}

export async function syncConfiguredStores(
  configuredStores: ShopifyStore[] = getEnv().shopifyStores,
  dbClient?: StoreBootstrapDb,
) {
  const rows = buildConfiguredStoreRows(configuredStores);

  if (rows.length === 0) {
    return rows;
  }

  const database: StoreBootstrapDb =
    dbClient ?? ((await import("@/db")).db as StoreBootstrapDb);

  await database
    .insert(stores)
    .values(buildStoreUpsertRows(configuredStores))
    .onConflictDoUpdate({
      target: stores.key,
      set: {
        name: sql.raw(`excluded.${stores.name.name}`),
        shopDomain: sql.raw(`excluded.${stores.shopDomain.name}`),
        credentialsRef: sql.raw(`excluded.${stores.credentialsRef.name}`),
        status: sql.raw(`excluded.${stores.status.name}`),
        updatedAt: sql`now()`,
      },
    });

  return rows;
}
