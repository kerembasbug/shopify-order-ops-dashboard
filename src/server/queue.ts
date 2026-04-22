import { PgBoss } from "pg-boss";
import { getEnv } from "@/server/env";
import type { SyncQueuePayload } from "@/server/orders/order-service";

export const SYNC_STORE_JOB_NAME = "sync-store";

export type QueueJob<T> = {
  data: T;
};

export type QueueSubscribeOptions = {
  batchSize?: number;
  localConcurrency?: number;
  pollingIntervalSeconds?: number;
};

export type QueueClient = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  send: <T extends object>(name: string, data: T) => Promise<string | null>;
  subscribe: <T extends object>(
    name: string,
    handler: (job: QueueJob<T>) => Promise<void>,
    options?: QueueSubscribeOptions,
  ) => Promise<string>;
  schedule: (
    scheduleName: string,
    cron: string,
    jobName: string,
    data: object,
  ) => Promise<void>;
};

type QueueClientOptions = {
  schedule?: boolean;
  supervise?: boolean;
  migrate?: boolean;
};

function logQueueError(error: unknown) {
  console.error("[queue]", error);
}

function createBoss(databaseUrl: string, options: QueueClientOptions) {
  const boss = new PgBoss({
    connectionString: databaseUrl,
    schedule: options.schedule ?? false,
    supervise: options.supervise ?? false,
    migrate: options.migrate ?? true,
  });

  boss.on("error", logQueueError);

  return boss;
}

export function createQueueClient(
  databaseUrl = getEnv().databaseUrl,
  options: QueueClientOptions = {},
): QueueClient {
  const boss = createBoss(databaseUrl, options);
  let startPromise: Promise<void> | undefined;
  let provisionQueuesPromise: Promise<void> | undefined;

  async function ensureStarted() {
    if (!startPromise) {
      startPromise = boss
        .start()
        .then(() => undefined)
        .catch((error) => {
          startPromise = undefined;
          throw error;
        });
    }

    await startPromise;
  }

  async function ensureQueuesProvisioned() {
    if (!provisionQueuesPromise) {
      provisionQueuesPromise = Promise.all([boss.createQueue(SYNC_STORE_JOB_NAME)])
        .then(() => undefined)
        .catch((error) => {
          provisionQueuesPromise = undefined;
          throw error;
        });
    }

    await provisionQueuesPromise;
  }

  return {
    async start() {
      await ensureStarted();
      await ensureQueuesProvisioned();
    },

    async stop() {
      await boss.stop();
    },

    async send(name, data) {
      await ensureStarted();
      await ensureQueuesProvisioned();
      return boss.send(name, data);
    },

    async subscribe(name, handler, options) {
      await ensureStarted();
      await ensureQueuesProvisioned();

      const wrappedHandler = async (jobs: Array<{ data: unknown }>) => {
        for (const job of jobs) {
          await handler({
            data: job.data as Parameters<typeof handler>[0]["data"],
          });
        }
      };

      return options
        ? boss.work(name, options, wrappedHandler)
        : boss.work(name, wrappedHandler);
    },

    async schedule(scheduleName, cron, jobName, data) {
      await ensureStarted();
      await ensureQueuesProvisioned();
      await boss.schedule(jobName, cron, data, {
        key: scheduleName,
      });
    },
  };
}

let cachedQueue: QueueClient | undefined;

function getQueueClient() {
  cachedQueue ??= createQueueClient();
  return cachedQueue;
}

export function createWorkerQueueClient(databaseUrl = getEnv().databaseUrl) {
  return createQueueClient(databaseUrl, {
    supervise: true,
  });
}

export const queue: QueueClient = {
  start() {
    return getQueueClient().start();
  },
  stop() {
    return getQueueClient().stop();
  },
  send(name, data) {
    return getQueueClient().send(name, data);
  },
  subscribe(name, handler) {
    return getQueueClient().subscribe(name, handler);
  },
  schedule(scheduleName, cron, jobName, data) {
    return getQueueClient().schedule(scheduleName, cron, jobName, data);
  },
};

export async function enqueueStoreSync(payload: SyncQueuePayload) {
  await queue.send(SYNC_STORE_JOB_NAME, payload);
}
