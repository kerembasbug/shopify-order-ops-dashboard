import { describe, expect, it, vi } from "vitest";
import { migrateAndBootstrapStores } from "@/db/migrate";

describe("migrateAndBootstrapStores", () => {
  it("runs store bootstrap after schema migrations", async () => {
    const runMigrate = vi.fn().mockResolvedValue(undefined);
    const bootstrapStores = vi.fn().mockResolvedValue(undefined);
    const database = {} as Parameters<typeof runMigrate>[0];

    await migrateAndBootstrapStores({
      database,
      runMigrate,
      bootstrapStores,
    });

    expect(runMigrate).toHaveBeenCalledWith(database, {
      migrationsFolder: "drizzle",
    });
    expect(bootstrapStores).toHaveBeenCalledTimes(1);
  });
});
