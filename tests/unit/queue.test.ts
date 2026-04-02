import { beforeEach, describe, expect, it, vi } from "vitest";

const startMock = vi.fn();
const sendMock = vi.fn();
const subscribeMock = vi.fn();
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
    scheduleMock.mockReset().mockResolvedValue("schedule-id");
    stopMock.mockReset().mockResolvedValue(undefined);
    createQueueMock.mockReset().mockResolvedValue(undefined);
    onMock.mockReset().mockReturnThis();
    pgBossConstructorMock.mockReset().mockImplementation(() => ({
      start: startMock,
      createQueue: createQueueMock,
      on: onMock,
      send: sendMock,
      subscribe: subscribeMock,
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
    expect(createQueueMock).toHaveBeenNthCalledWith(2, "sync-all-stores");
    expect(sendMock).toHaveBeenCalledWith(SYNC_STORE_JOB_NAME, payload);
  });

  it("provisions the required queues before starting worker processing", async () => {
    const { createQueueClient, SYNC_ALL_STORES_JOB_NAME, SYNC_STORE_JOB_NAME } =
      await import("@/server/queue");

    const client = createQueueClient();

    await client.start();

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(createQueueMock).toHaveBeenNthCalledWith(1, SYNC_STORE_JOB_NAME);
    expect(createQueueMock).toHaveBeenNthCalledWith(2, SYNC_ALL_STORES_JOB_NAME);
  });

  it("enables scheduler features for dedicated worker clients", async () => {
    const { createWorkerQueueClient } = await import("@/server/queue");

    createWorkerQueueClient();

    expect(pgBossConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: true,
        supervise: true,
      }),
    );
  });
});
