import { and, eq, ne, notInArray, sql } from "drizzle-orm";
import { stores } from "@/db/schema";
import { getEnv, type ShopifyStore } from "@/server/env";

type StoreInsert = typeof stores.$inferInsert;
type StoreConflictUpdate = {
  target: typeof stores.key;
  set: Record<string, unknown>;
};
type StoreUpdateValues = Omit<Partial<StoreInsert>, "updatedAt"> & {
  updatedAt: ReturnType<typeof sql>;
};

export type StoreBootstrapDb = {
  insert: (table: typeof stores) => {
    values: (values: StoreInsert[]) => {
      onConflictDoUpdate: (config: StoreConflictUpdate) => Promise<unknown>;
    };
  };
  update: (table: typeof stores) => {
    set: (values: StoreUpdateValues) => {
      where: (condition: unknown) => Promise<unknown>;
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

function buildActiveStoreValues(store: ShopifyStore): StoreUpdateValues {
  return {
    key: store.key,
    name: store.name,
    shopDomain: store.domain,
    credentialsRef: store.key,
    status: "active",
    updatedAt: sql`now()`,
  };
}

async function reconcileStoreKeyRenames(
  database: StoreBootstrapDb,
  configuredStores: ShopifyStore[],
) {
  for (const store of configuredStores) {
    await database
      .update(stores)
      .set(buildActiveStoreValues(store))
      .where(and(eq(stores.shopDomain, store.domain), ne(stores.key, store.key)));
  }
}

async function markInactiveStores(
  database: StoreBootstrapDb,
  configuredStores: ShopifyStore[],
) {
  const baseUpdate = database.update(stores).set({
    status: "inactive",
    updatedAt: sql`now()`,
  });

  if (configuredStores.length === 0) {
    await baseUpdate.where(sql`true`);
    return;
  }

  await baseUpdate.where(notInArray(stores.key, configuredStores.map((store) => store.key)));
}

export async function syncConfiguredStores(
  configuredStores: ShopifyStore[] = getEnv().shopifyStores,
  dbClient?: StoreBootstrapDb,
) {
  const rows = buildConfiguredStoreRows(configuredStores);

  const database: StoreBootstrapDb =
    dbClient ?? ((await import("@/db")).db as StoreBootstrapDb);

  if (rows.length === 0) {
    await markInactiveStores(database, configuredStores);
    return rows;
  }

  await reconcileStoreKeyRenames(database, configuredStores);

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

  await markInactiveStores(database, configuredStores);

  return rows;
}
