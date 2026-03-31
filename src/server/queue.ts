import { refreshOverviewSnapshot } from "@/server/orders/overview";
import { createSyncRepo, type SyncQueuePayload } from "@/server/orders/order-service";
import { syncStore } from "@/server/orders/sync-store";

const queuedStoreSyncs = new Map<number, Promise<void>>();

async function refreshQueuedStoreOverview(storeId: number | string) {
  if (typeof storeId !== "number") {
    throw new Error("Queued store sync requires a numeric storeId");
  }

  await refreshOverviewSnapshot(storeId);
}

export async function enqueueStoreSync(payload: SyncQueuePayload) {
  const previous = queuedStoreSyncs.get(payload.storeId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() =>
      syncStore(
        {
          repo: createSyncRepo(),
          refreshOverview: refreshQueuedStoreOverview,
        },
        payload,
      ),
    );

  const managedNext = next.catch((error) => {
    console.error("Queued store sync failed", {
      storeId: payload.storeId,
      syncRunId: payload.syncRunId,
      error,
    });
  });

  queuedStoreSyncs.set(payload.storeId, managedNext);

  void managedNext.finally(() => {
    if (queuedStoreSyncs.get(payload.storeId) === managedNext) {
      queuedStoreSyncs.delete(payload.storeId);
    }
  });
}

export function getQueuedStoreSyncCount() {
  return queuedStoreSyncs.size;
}
