import { fileURLToPath } from "node:url";
import { refreshOverviewSnapshot } from "@/server/orders/overview";
import { createSyncRepo } from "@/server/orders/order-service";
import {
  syncStore,
  type StoreIdentifier,
  type SyncStoreInput,
} from "@/server/orders/sync-store";
import {
  createWorkerQueueClient,
  SYNC_STORE_JOB_NAME,
  type QueueClient,
} from "@/server/queue";
import { syncConfiguredStores } from "@/server/store-config";

export { SYNC_STORE_JOB_NAME } from "@/server/queue";

type WorkerDeps = {
  queue?: QueueClient;
  syncConfiguredStores?: () => Promise<unknown>;
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
