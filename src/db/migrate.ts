import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";
import {
  syncConfiguredStores,
  type StoreBootstrapDb,
} from "@/server/store-config";

type MigrateAndBootstrapArgs = {
  database?: typeof db;
  runMigrate?: typeof migrate;
  bootstrapStores?: () => Promise<unknown>;
};

export async function migrateAndBootstrapStores({
  database = db,
  runMigrate = migrate,
  bootstrapStores = () =>
    syncConfiguredStores(undefined, database as unknown as StoreBootstrapDb),
}: MigrateAndBootstrapArgs = {}) {
  await runMigrate(database, {
    migrationsFolder: "drizzle",
  });

  await bootstrapStores();
}

async function main() {
  await migrateAndBootstrapStores();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
