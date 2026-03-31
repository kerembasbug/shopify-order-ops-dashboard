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
  it("marks all persisted stores inactive when no stores remain configured", async () => {
    const inactiveWhere = vi.fn().mockResolvedValue(undefined);
    const inactiveSet = vi.fn(() => ({
      where: inactiveWhere,
    }));
    const update = vi.fn(() => ({
      set: inactiveSet,
    }));
    const insert = vi.fn();

    const db = {
      insert,
      update,
    } as unknown as StoreBootstrapDb;

    const rows = await syncConfiguredStores([], db);

    expect(rows).toEqual([]);
    expect(insert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(inactiveSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "inactive",
        updatedAt: expect.anything(),
      }),
    );
    expect(inactiveWhere).toHaveBeenCalledTimes(1);
  });

  it("upserts configured stores into persistence", async () => {
    const renameWhere = vi.fn().mockResolvedValue(undefined);
    const renameSet = vi.fn(() => ({
      where: renameWhere,
    }));
    const inactiveWhere = vi.fn().mockResolvedValue(undefined);
    const inactiveSet = vi.fn(() => ({
      where: inactiveWhere,
    }));
    const update = vi
      .fn()
      .mockReturnValueOnce({
        set: renameSet,
      })
      .mockReturnValueOnce({
        set: inactiveSet,
      });
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({
      onConflictDoUpdate,
    }));
    const insert = vi.fn(() => ({
      values,
    }));

    const db: StoreBootstrapDb = {
      insert,
      update,
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
    expect(update).toHaveBeenCalledTimes(2);
    expect(renameSet).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "robot-arm",
        name: "DIY Robotic Arm",
        credentialsRef: "robot-arm",
        status: "active",
        updatedAt: expect.anything(),
      }),
    );
    expect(inactiveSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "inactive",
        updatedAt: expect.anything(),
      }),
    );
  });

  it("reconciles same-domain store key renames before the key-based upsert", async () => {
    const renameWhere = vi.fn().mockResolvedValue(undefined);
    const renameSet = vi.fn(() => ({
      where: renameWhere,
    }));
    const inactiveWhere = vi.fn().mockResolvedValue(undefined);
    const inactiveSet = vi.fn(() => ({
      where: inactiveWhere,
    }));
    const update = vi
      .fn()
      .mockReturnValueOnce({
        set: renameSet,
      })
      .mockReturnValueOnce({
        set: inactiveSet,
      });
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({
      onConflictDoUpdate,
    }));
    const insert = vi.fn(() => ({
      values,
    }));

    const db: StoreBootstrapDb = {
      insert,
      update,
    };

    await syncConfiguredStores(
      [
        {
          key: "robot-arm-v2",
          name: "DIY Robotic Arm",
          domain: "robot-arm.myshopify.com",
          adminToken: "shpat_test",
        },
      ],
      db,
    );

    expect(renameSet).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "robot-arm-v2",
        name: "DIY Robotic Arm",
        credentialsRef: "robot-arm-v2",
        status: "active",
        updatedAt: expect.anything(),
      }),
    );
    expect(renameWhere).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });
});
