import { refreshOverviewSnapshot } from "@/server/orders/overview";
import { lockStoreSync } from "@/server/locks";
import { fetchOrders } from "@/server/shopify/client";
import { mapShopifyOrder, type MappedShopifyOrder } from "@/server/shopify/map-order";
import type { FetchOrdersParams, FetchOrdersResult } from "@/server/shopify/types";

export type StoreIdentifier = number | string;
export type SyncRunIdentifier = number | string;

type SyncResult = {
  ordersScanned: number;
  ordersChanged: number;
};

type SyncStoreRepository = {
  markSyncStarted: (syncRunId: SyncRunIdentifier) => Promise<void>;
  upsertMappedOrder: (
    storeId: StoreIdentifier,
    mapped: MappedShopifyOrder,
  ) => Promise<void>;
  markSyncSucceeded: (
    syncRunId: SyncRunIdentifier,
    result: SyncResult,
  ) => Promise<void>;
  markSyncFailed: (
    syncRunId: SyncRunIdentifier,
    errorMessage: string,
  ) => Promise<void>;
};

type SyncStoreClient = (
  params: FetchOrdersParams,
) => Promise<FetchOrdersResult>;

type SyncStoreLock = <T>(
  storeId: StoreIdentifier,
  callback: () => Promise<T>,
) => Promise<T>;

export type SyncStoreDeps = {
  client?: SyncStoreClient;
  repo: SyncStoreRepository;
  refreshOverview?: (storeId: StoreIdentifier) => Promise<void>;
  lockStore?: SyncStoreLock;
};

export type SyncStoreInput = {
  storeId: StoreIdentifier;
  syncRunId: SyncRunIdentifier;
  storeDomain: string;
  adminToken: string;
  updatedAfter?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown sync failure";
}

async function defaultRefreshOverview(storeId: StoreIdentifier) {
  if (typeof storeId !== "number") {
    throw new Error("Default overview refresh requires a numeric storeId");
  }

  await refreshOverviewSnapshot(storeId);
}

async function defaultLockStore<T>(
  storeId: StoreIdentifier,
  callback: () => Promise<T>,
) {
  return lockStoreSync(String(storeId), callback);
}

export async function syncStore(deps: SyncStoreDeps, input: SyncStoreInput) {
  const client = deps.client ?? fetchOrders;
  const lockStore = deps.lockStore ?? defaultLockStore;
  const refreshOverview = deps.refreshOverview ?? defaultRefreshOverview;

  return lockStore(input.storeId, async () => {
    await deps.repo.markSyncStarted(input.syncRunId);

    try {
      let scanned = 0;
      let changed = 0;
      let cursor: string | null = null;

      do {
        const page = await client({
          storeDomain: input.storeDomain,
          adminToken: input.adminToken,
          updatedAfter: input.updatedAfter,
          cursor,
        });

        for (const order of page.orders) {
          await deps.repo.upsertMappedOrder(input.storeId, mapShopifyOrder(order));
          scanned += 1;
          changed += 1;
        }

        cursor = page.nextCursor;
      } while (cursor);

      await refreshOverview(input.storeId);
      await deps.repo.markSyncSucceeded(input.syncRunId, {
        ordersScanned: scanned,
        ordersChanged: changed,
      });
    } catch (error) {
      await deps.repo.markSyncFailed(input.syncRunId, getErrorMessage(error));
      throw error;
    }
  });
}
