import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderIssues, orderNotes, orders, overviewSnapshots } from "@/db/schema";

export type OverviewMetrics = {
  totalOrders: number;
  totalSalesAmount: string;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  openIssuesCount: number;
  ordersWithNotesCount: number;
};

export type OverviewSnapshotRecord = OverviewMetrics & {
  storeId: number;
  capturedAt: Date;
};

export type RefreshOverviewSnapshotDeps = {
  loadOverviewMetrics: (storeId: number) => Promise<OverviewMetrics>;
  replaceOverviewSnapshot: (
    storeId: number,
    snapshot: OverviewSnapshotRecord,
  ) => Promise<void>;
};

export async function loadOverviewMetrics(
  storeId: number,
): Promise<OverviewMetrics> {
  const [aggregate] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      totalSalesAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)::text`,
      fulfilledOrders: sql<number>`count(*) filter (where ${orders.fulfillmentStatus} = 'FULFILLED')::int`,
      unfulfilledOrders: sql<number>`count(*) filter (
        where coalesce(${orders.fulfillmentStatus}, '') <> 'FULFILLED'
      )::int`,
      openIssuesCount: sql<number>`count(
        distinct case
          when exists (
            select 1
            from ${orderIssues}
            where ${orderIssues.orderId} = ${orders.id}
              and ${orderIssues.status} = 'open'
          )
          then ${orders.id}
          else null
        end
      )::int`,
      ordersWithNotesCount: sql<number>`count(
        distinct case
          when exists (
            select 1
            from ${orderNotes}
            where ${orderNotes.orderId} = ${orders.id}
          )
          then ${orders.id}
          else null
        end
      )::int`,
    })
    .from(orders)
    .where(eq(orders.storeId, storeId));

  return {
    totalOrders: aggregate?.totalOrders ?? 0,
    totalSalesAmount: aggregate?.totalSalesAmount ?? "0",
    fulfilledOrders: aggregate?.fulfilledOrders ?? 0,
    unfulfilledOrders: aggregate?.unfulfilledOrders ?? 0,
    openIssuesCount: aggregate?.openIssuesCount ?? 0,
    ordersWithNotesCount: aggregate?.ordersWithNotesCount ?? 0,
  };
}

export async function replaceOverviewSnapshot(
  storeId: number,
  snapshot: OverviewSnapshotRecord,
) {
  await db.transaction(async (transaction) => {
    await transaction.execute(sql.raw('lock table "overview_snapshots" in exclusive mode'));

    await transaction
      .delete(overviewSnapshots)
      .where(eq(overviewSnapshots.storeId, storeId));

    await transaction.insert(overviewSnapshots).values(snapshot);
  });
}

const defaultRefreshOverviewSnapshotDeps: RefreshOverviewSnapshotDeps = {
  loadOverviewMetrics,
  replaceOverviewSnapshot,
};

export async function refreshOverviewSnapshot(
  storeId: number,
  deps: RefreshOverviewSnapshotDeps = defaultRefreshOverviewSnapshotDeps,
) {
  const metrics = await deps.loadOverviewMetrics(storeId);
  const snapshot: OverviewSnapshotRecord = {
    storeId,
    ...metrics,
    capturedAt: new Date(),
  };

  await deps.replaceOverviewSnapshot(storeId, snapshot);

  return snapshot;
}
