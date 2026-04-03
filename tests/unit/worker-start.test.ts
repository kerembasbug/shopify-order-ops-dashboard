import { beforeEach, describe, expect, it, vi } from "vitest";

describe("startWorker", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("boots the worker, registers handlers, and schedules sync-all jobs", async () => {
    const queue = {
      start: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue("job-id"),
      subscribe: vi.fn().mockResolvedValue("subscription-id"),
      schedule: vi.fn().mockResolvedValue("schedule-id"),
    };
    const syncConfiguredStores = vi.fn().mockResolvedValue(undefined);
    const createSyncRunsForSelection = vi.fn().mockResolvedValue([
      {
        storeId: 12,
        syncRunId: 44,
        storeDomain: "robot-arm.myshopify.com",
        adminToken: "shpat_test",
      },
    ]);
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
      createSyncRunsForSelection,
      createSyncRepo,
      syncStore,
      refreshOverviewSnapshot,
    });

    expect(syncConfiguredStores).toHaveBeenCalledTimes(1);
    expect(queue.start).toHaveBeenCalledTimes(1);
    expect(queue.subscribe).toHaveBeenCalledTimes(2);
    expect(queue.subscribe).toHaveBeenNthCalledWith(
      1,
      workerModule.SYNC_STORE_JOB_NAME,
      expect.any(Function),
      {
        localConcurrency: 4,
        pollingIntervalSeconds: 1,
      },
    );
    expect(queue.schedule).toHaveBeenCalledWith(
      workerModule.SYNC_ALL_STORES_SCHEDULE_NAME,
      workerModule.SYNC_ALL_STORES_CRON,
      workerModule.SYNC_ALL_STORES_JOB_NAME,
      {},
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

    const syncAllStoresHandler = queue.subscribe.mock.calls.find(
      ([jobName]) => jobName === workerModule.SYNC_ALL_STORES_JOB_NAME,
    )?.[1];

    expect(syncAllStoresHandler).toBeTypeOf("function");

    await syncAllStoresHandler();

    expect(createSyncRunsForSelection).toHaveBeenCalledWith({
      triggerType: "scheduled",
    });
    expect(queue.send).toHaveBeenCalledWith(workerModule.SYNC_STORE_JOB_NAME, {
      storeId: 12,
      syncRunId: 44,
      storeDomain: "robot-arm.myshopify.com",
      adminToken: "shpat_test",
    });
  }, 15_000);
});
