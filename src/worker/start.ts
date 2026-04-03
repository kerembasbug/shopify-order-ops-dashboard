import { fileURLToPath } from "node:url";
import { refreshOverviewSnapshot } from "@/server/orders/overview";
import {
  createSyncRepo,
  createSyncRunsForSelection,
  type SyncQueuePayload,
} from "@/server/orders/order-service";
import {
  syncStore,
  type StoreIdentifier,
  type SyncStoreInput,
} from "@/server/orders/sync-store";
import {
  createWorkerQueueClient,
  SYNC_ALL_STORES_CRON,
  SYNC_ALL_STORES_JOB_NAME,
  SYNC_ALL_STORES_SCHEDULE_NAME,
  SYNC_STORE_JOB_NAME,
  type QueueClient,
} from "@/server/queue";
import { syncConfiguredStores } from "@/server/store-config";

export {
  SYNC_ALL_STORES_CRON,
  SYNC_ALL_STORES_JOB_NAME,
  SYNC_ALL_STORES_SCHEDULE_NAME,
  SYNC_STORE_JOB_NAME,
} from "@/server/queue";

type WorkerDeps = {
  queue?: QueueClient;
  syncConfiguredStores?: () => Promise<unknown>;
  createSyncRunsForSelection?: typeof createSyncRunsForSelection;
  createSyncRepo?: typeof createSyncRepo;
  syncStore?: typeof syncStore;
  refreshOverviewSnapshot?: (storeId: StoreIdentifier) => Promise<void>;
};

async function refreshOverviewForWorker(storeId: StoreIdentifier) {
  if (typeof storeId !== "number") {
    throw new Error("Worker overview refresh requires a numeric storeId");
  }

  await refreshOverviewSnapshot(storeId);
}

export async function startWorker(deps: WorkerDeps = {}) {
  const queueClient = deps.queue ?? createWorkerQueueClient();
  const bootstrapStores = deps.syncConfiguredStores ?? syncConfiguredStores;
  const createRuns = deps.createSyncRunsForSelection ?? createSyncRunsForSelection;
  const createRepo = deps.createSyncRepo ?? createSyncRepo;
  const runStoreSync = deps.syncStore ?? syncStore;
  const refreshOverview = deps.refreshOverviewSnapshot ?? refreshOverviewForWorker;
  const repo = createRepo();

  await bootstrapStores();
  await queueClient.start();

  await queueClient.subscribe<SyncStoreInput>(SYNC_STORE_JOB_NAME, async (job) => {
    await runStoreSync(
      {
        repo,
        refreshOverview,
      },
      job.data,
    );
  }, {
    localConcurrency: 4,
    pollingIntervalSeconds: 1,
  });

  await queueClient.subscribe<Record<string, never>>(
    SYNC_ALL_STORES_JOB_NAME,
    async () => {
      const runs = await createRuns({
        triggerType: "scheduled",
      });

      for (const run of runs) {
        await queueClient.send<SyncQueuePayload>(SYNC_STORE_JOB_NAME, run);
      }
    },
  );

  await queueClient.schedule(
    SYNC_ALL_STORES_SCHEDULE_NAME,
    SYNC_ALL_STORES_CRON,
    SYNC_ALL_STORES_JOB_NAME,
    {},
  );

  return {
    queue: queueClient,
  };
}

async function main() {
  const worker = await startWorker();
  let isStopping = false;

  async function stopWorker() {
    if (isStopping) {
      return;
    }

    isStopping = true;
    await worker.queue.stop();
  }

  process.on("SIGINT", () => {
    void stopWorker().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void stopWorker().finally(() => process.exit(0));
  });
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFile && process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
