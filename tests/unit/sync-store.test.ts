import { describe, expect, it, vi } from "vitest";
import { syncStore } from "@/server/orders/sync-store";

vi.mock("@/server/shopify/map-order", () => ({
  mapShopifyOrder: vi.fn((order: { id: string; name: string }) => ({
    order: {
      shopifyOrderId: order.id,
      shopifyOrderNumber: Number(order.name.replace(/^[^0-9]*/, "")),
    },
    fulfillments: [],
  })),
}));

describe("syncStore", () => {
  it("locks, marks start, pages orders, upserts mapped orders, refreshes overview, and marks success", async () => {
    const client = vi
      .fn()
      .mockResolvedValueOnce({
        orders: [
          {
            id: "gid://shopify/Order/1",
            name: "#1001",
          },
        ],
        nextCursor: "cursor-2",
      })
      .mockResolvedValueOnce({
        orders: [
          {
            id: "gid://shopify/Order/2",
            name: "#1002",
          },
        ],
        nextCursor: null,
      });

    const repo = {
      markSyncStarted: vi.fn().mockResolvedValue(undefined),
      upsertMappedOrder: vi.fn().mockResolvedValue(undefined),
      markSyncSucceeded: vi.fn().mockResolvedValue(undefined),
      markSyncFailed: vi.fn().mockResolvedValue(undefined),
    };

    const refreshOverview = vi.fn().mockResolvedValue(undefined);
    const lockStore = vi.fn(
      async (_storeId: string | number, callback: () => Promise<void>) => callback(),
    );

    await syncStore(
      {
        client,
        repo,
        refreshOverview,
        lockStore,
      },
      {
        storeId: "store_1",
        syncRunId: "run_1",
        storeDomain: "robot-arm.myshopify.com",
        adminToken: "shpat_test",
      },
    );

    expect(lockStore).toHaveBeenCalledWith("store_1", expect.any(Function));
    expect(repo.markSyncStarted).toHaveBeenCalledWith("run_1");
    expect(client).toHaveBeenNthCalledWith(1, {
      storeDomain: "robot-arm.myshopify.com",
      adminToken: "shpat_test",
      updatedAfter: undefined,
      cursor: null,
    });
    expect(client).toHaveBeenNthCalledWith(2, {
      storeDomain: "robot-arm.myshopify.com",
      adminToken: "shpat_test",
      updatedAfter: undefined,
      cursor: "cursor-2",
    });
    expect(repo.upsertMappedOrder).toHaveBeenCalledTimes(2);
    expect(refreshOverview).toHaveBeenCalledWith("store_1");
    expect(repo.markSyncSucceeded).toHaveBeenCalledWith("run_1", {
      ordersScanned: 2,
      ordersChanged: 2,
    });

    const callOrder = [
      lockStore.mock.invocationCallOrder[0],
      repo.markSyncStarted.mock.invocationCallOrder[0],
      client.mock.invocationCallOrder[0],
      repo.upsertMappedOrder.mock.invocationCallOrder[0],
      refreshOverview.mock.invocationCallOrder[0],
      repo.markSyncSucceeded.mock.invocationCallOrder[0],
    ];

    expect(callOrder).toEqual([...callOrder].sort((a, b) => a - b));
  });

  it("marks the sync as failed when a page fetch blows up", async () => {
    const error = new Error("shopify exploded");
    const client = vi.fn().mockRejectedValue(error);

    const repo = {
      markSyncStarted: vi.fn().mockResolvedValue(undefined),
      upsertMappedOrder: vi.fn().mockResolvedValue(undefined),
      markSyncSucceeded: vi.fn().mockResolvedValue(undefined),
      markSyncFailed: vi.fn().mockResolvedValue(undefined),
    };

    const refreshOverview = vi.fn().mockResolvedValue(undefined);
    const lockStore = vi.fn(
      async (_storeId: string | number, callback: () => Promise<void>) => callback(),
    );

    await expect(
      syncStore(
        {
          client,
          repo,
          refreshOverview,
          lockStore,
        },
        {
          storeId: "store_1",
          syncRunId: "run_1",
          storeDomain: "robot-arm.myshopify.com",
          adminToken: "shpat_test",
        },
      ),
    ).rejects.toThrow("shopify exploded");

    expect(repo.markSyncFailed).toHaveBeenCalledWith("run_1", "shopify exploded");
    expect(repo.markSyncSucceeded).not.toHaveBeenCalled();
  });
});
