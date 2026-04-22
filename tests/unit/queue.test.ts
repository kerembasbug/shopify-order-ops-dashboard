import { beforeEach, describe, expect, it, vi } from "vitest";

const startMock = vi.fn();
const sendMock = vi.fn();
const subscribeMock = vi.fn();
const workMock = vi.fn();
const scheduleMock = vi.fn();
const stopMock = vi.fn();
const createQueueMock = vi.fn();
const onMock = vi.fn();
const pgBossConstructorMock = vi.fn();
const getEnvMock = vi.fn();

vi.mock("pg-boss", () => ({
  PgBoss: pgBossConstructorMock,
}));

vi.mock("@/server/env", () => ({
  getEnv: getEnvMock,
}));

describe("queue", () => {
  beforeEach(() => {
    vi.resetModules();
    startMock.mockReset().mockResolvedValue(undefined);
    sendMock.mockReset().mockResolvedValue("job-id");
    subscribeMock.mockReset().mockResolvedValue("subscription-id");
    workMock.mockReset().mockResolvedValue("worker-id");
    scheduleMock.mockReset().mockResolvedValue("schedule-id");
    stopMock.mockReset().mockResolvedValue(undefined);
    createQueueMock.mockReset().mockResolvedValue(undefined);
    onMock.mockReset().mockReturnThis();
    pgBossConstructorMock.mockReset().mockImplementation(() => ({
      start: startMock,
      createQueue: createQueueMock,
      on: onMock,
      send: sendMock,
      work: workMock,
      schedule: scheduleMock,
      stop: stopMock,
    }));
    getEnvMock.mockReset().mockReturnValue({
      databaseUrl: "postgres://postgres:postgres@127.0.0.1:5432/shopify_order_ops",
    });
  });

  it("enqueues store sync jobs through the queue client", async () => {
    const payload = {
      storeId: 7,
      syncRunId: 91,
      storeDomain: "robot-arm.myshopify.com",
      adminToken: "shpat_test",
      updatedAfter: "2026-04-02T10:00:00.000Z",
    };
    const { enqueueStoreSync, SYNC_STORE_JOB_NAME } = await import("@/server/queue");

    await enqueueStoreSync(payload);

    expect(pgBossConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://postgres:postgres@127.0.0.1:5432/shopify_order_ops",
        schedule: false,
        supervise: false,
        migrate: true,
      }),
    );
    expect(onMock).toHaveBeenCalledWith("error", expect.any(Function));
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(createQueueMock).toHaveBeenNthCalledWith(1, SYNC_STORE_JOB_NAME);
    expect(sendMock).toHaveBeenCalledWith(SYNC_STORE_JOB_NAME, payload);
  });

  it("provisions the required queues before starting worker processing", async () => {
    const { createQueueClient, SYNC_STORE_JOB_NAME } = await import("@/server/queue");

    const client = createQueueClient();

    await client.start();

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(createQueueMock).toHaveBeenNthCalledWith(1, SYNC_STORE_JOB_NAME);
  });

  it("enables scheduler features for dedicated worker clients", async () => {
    const { createWorkerQueueClient } = await import("@/server/queue");

    createWorkerQueueClient();

    expect(pgBossConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: false,
        supervise: true,
      }),
    );
  });

  it("forwards worker options when subscribing to queue jobs", async () => {
    const { createQueueClient } = await import("@/server/queue");

    const client = createQueueClient();
    const handler = vi.fn().mockResolvedValue(undefined);

    await client.subscribe("sync-store", handler, {
      localConcurrency: 4,
      pollingIntervalSeconds: 1,
    });

    expect(workMock).toHaveBeenCalledWith(
      "sync-store",
      {
        localConcurrency: 4,
        pollingIntervalSeconds: 1,
      },
      expect.any(Function),
    );
  });
});
