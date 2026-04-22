import { beforeEach, describe, expect, it, vi } from "vitest";

describe("startWorker", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("boots the worker and registers the store sync handler", async () => {
    const queue = {
      start: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue("subscription-id"),
    };
    const syncConfiguredStores = vi.fn().mockResolvedValue(undefined);
    const repo = {
      markSyncStarted: vi.fn(),
      upsertMappedOrder: vi.fn(),
      markSyncSucceeded: vi.fn(),
      markSyncFailed: vi.fn(),
    };
    const createSyncRepo = vi.fn().mockReturnValue(repo);
    const syncStore = vi.fn().mockResolvedValue(undefined);
    const refreshOverviewSnapshot = vi.fn().mockResolvedValue(undefined);

    const workerModule = await import("@/worker/start");

    await workerModule.startWorker({
      queue,
      syncConfiguredStores,
      createSyncRepo,
      syncStore,
      refreshOverviewSnapshot,
    });

    expect(syncConfiguredStores).toHaveBeenCalledTimes(1);
    expect(queue.start).toHaveBeenCalledTimes(1);
    expect(queue.subscribe).toHaveBeenCalledTimes(1);
    expect(queue.subscribe).toHaveBeenNthCalledWith(
      1,
      workerModule.SYNC_STORE_JOB_NAME,
      expect.any(Function),
      {
        localConcurrency: 4,
        pollingIntervalSeconds: 1,
      },
    );

    const syncStoreHandler = queue.subscribe.mock.calls.find(
      ([jobName]) => jobName === workerModule.SYNC_STORE_JOB_NAME,
    )?.[1];

    expect(syncStoreHandler).toBeTypeOf("function");

    await syncStoreHandler({
      data: {
        storeId: 12,
        syncRunId: 44,
        storeDomain: "robot-arm.myshopify.com",
        adminToken: "shpat_test",
      },
    });

    expect(syncStore).toHaveBeenCalledWith(
      {
        repo,
        refreshOverview: refreshOverviewSnapshot,
      },
      {
        storeId: 12,
        syncRunId: 44,
        storeDomain: "robot-arm.myshopify.com",
        adminToken: "shpat_test",
      },
    );
  }, 15_000);
});
