import { describe, expect, it, vi } from "vitest";
import {
  buildConfiguredStoreRows,
  syncConfiguredStores,
  type StoreBootstrapDb,
} from "@/server/store-config";

describe("buildConfiguredStoreRows", () => {
  it("maps env-configured stores into stable persistence rows", () => {
    const rows = buildConfiguredStoreRows([
      {
        key: "robot-arm",
        name: "DIY Robotic Arm",
        domain: "robot-arm.myshopify.com",
        adminToken: "shpat_test",
      },
    ]);

    expect(rows).toEqual([
      {
        key: "robot-arm",
        name: "DIY Robotic Arm",
        shopDomain: "robot-arm.myshopify.com",
        status: "active",
      },
    ]);
  });
});

describe("syncConfiguredStores", () => {
  it("upserts configured stores into persistence", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({
      onConflictDoUpdate,
    }));
    const insert = vi.fn(() => ({
      values,
    }));

    const db: StoreBootstrapDb = {
      insert,
    };

    const rows = await syncConfiguredStores(
      [
        {
          key: "robot-arm",
          name: "DIY Robotic Arm",
          domain: "robot-arm.myshopify.com",
          adminToken: "shpat_test",
        },
      ],
      db,
    );

    expect(rows).toEqual([
      {
        key: "robot-arm",
        name: "DIY Robotic Arm",
        shopDomain: "robot-arm.myshopify.com",
        status: "active",
      },
    ]);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith([
      {
        key: "robot-arm",
        name: "DIY Robotic Arm",
        shopDomain: "robot-arm.myshopify.com",
        credentialsRef: "robot-arm",
        status: "active",
      },
    ]);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });
});
