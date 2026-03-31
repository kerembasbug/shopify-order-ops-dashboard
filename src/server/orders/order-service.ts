import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderFulfillments,
  orderIssues,
  orderNotes,
  orders,
  stores,
  syncRuns,
} from "@/db/schema";
import { getEnv } from "@/server/env";
import { listIssuesForOrder } from "@/server/issues/issue-service";
import { listNotesForOrder } from "@/server/notes/note-service";
import { parseOrderFilters } from "@/server/orders/filters";
import type { MappedShopifyOrder } from "@/server/shopify/map-order";

type SyncRunTrigger = "manual" | "scheduled" | "initial_import";

type SyncSelectionOptions = {
  storeId?: number | null;
  triggerType?: SyncRunTrigger;
};

export type SyncQueuePayload = {
  storeId: number;
  syncRunId: number;
  storeDomain: string;
  adminToken: string;
  updatedAfter?: string;
};

function getOpenIssueExistsSql() {
  return sql<boolean>`exists (
    select 1
    from ${orderIssues}
    where ${orderIssues.orderId} = ${orders.id}
      and ${orderIssues.status} = 'open'
  )`;
}

function getHasNotesExistsSql() {
  return sql<boolean>`exists (
    select 1
    from ${orderNotes}
    where ${orderNotes.orderId} = ${orders.id}
  )`;
}

function buildSearchCondition(search: string) {
  if (!search) {
    return undefined;
  }

  const pattern = `%${search}%`;
  const digits = search.replace(/\D+/g, "");

  return sql<boolean>`(
    coalesce(${orders.customerName}, '') ilike ${pattern}
    or coalesce(${orders.customerEmail}, '') ilike ${pattern}
    ${digits
      ? sql`or cast(${orders.shopifyOrderNumber} as text) ilike ${`%${digits}%`}`
      : sql``}
  )`;
}

function buildDateFrom(dateFrom: string | null) {
  if (!dateFrom) {
    return null;
  }

  const value = new Date(`${dateFrom}T00:00:00.000Z`);

  return Number.isNaN(value.getTime()) ? null : value;
}

function buildDateTo(dateTo: string | null) {
  if (!dateTo) {
    return null;
  }

  const value = new Date(`${dateTo}T23:59:59.999Z`);

  return Number.isNaN(value.getTime()) ? null : value;
}

function buildOrderWhereClause(filters: ReturnType<typeof parseOrderFilters>) {
  const openIssueExists = getOpenIssueExistsSql();
  const hasNotesExists = getHasNotesExistsSql();
  const createdAfter = buildDateFrom(filters.dateFrom);
  const createdBefore = buildDateTo(filters.dateTo);

  return and(
    filters.storeId ? eq(orders.storeId, filters.storeId) : undefined,
    filters.fulfillment === "fulfilled"
      ? eq(orders.fulfillmentStatus, "FULFILLED")
      : undefined,
    filters.fulfillment === "unfulfilled"
      ? sql<boolean>`coalesce(${orders.fulfillmentStatus}, '') <> 'FULFILLED'`
      : undefined,
    filters.hasIssues ? openIssueExists : undefined,
    filters.hasNotes ? hasNotesExists : undefined,
    buildSearchCondition(filters.search),
    createdAfter ? gte(orders.createdAt, createdAfter) : undefined,
    createdBefore ? lte(orders.createdAt, createdBefore) : undefined,
  );
}

function getConfiguredStoreTokenMap() {
  return new Map(
    getEnv().shopifyStores.map((store) => [store.key, store.adminToken] as const),
  );
}

export async function createSyncRunsForSelection(
  options: SyncSelectionOptions = {},
) {
  const tokenMap = getConfiguredStoreTokenMap();
  const triggerType = options.triggerType ?? "manual";

  const storeQuery = db
    .select({
      id: stores.id,
      key: stores.key,
      credentialsRef: stores.credentialsRef,
      shopDomain: stores.shopDomain,
      lastSuccessfulSyncAt: stores.lastSuccessfulSyncAt,
    })
    .from(stores)
    .where(
      and(
        eq(stores.status, "active"),
        options.storeId ? eq(stores.id, options.storeId) : undefined,
      ),
    );

  const selectedStores = await storeQuery;
  const validatedStores = selectedStores.map((store) => {
    const tokenKey = store.credentialsRef ?? store.key;
    const adminToken = tokenMap.get(tokenKey);

    if (!adminToken) {
      throw new Error(`Missing Shopify admin token for store ${store.key}`);
    }

    return {
      storeId: store.id,
      storeDomain: store.shopDomain,
      adminToken,
      updatedAfter: store.lastSuccessfulSyncAt?.toISOString(),
    };
  });

  return db.transaction(async (transaction) =>
    Promise.all(
      validatedStores.map(async (store) => {
        const [created] = await transaction
          .insert(syncRuns)
          .values({
            storeId: store.storeId,
            triggerType,
            status: "pending",
          })
          .returning({ id: syncRuns.id });

        return {
          ...store,
          syncRunId: created.id,
        } satisfies SyncQueuePayload;
      }),
    ),
  );
}

export function createSyncRepo() {
  return {
    async markSyncStarted(syncRunId: number | string) {
      await db
        .update(syncRuns)
        .set({
          status: "running",
          startedAt: new Date(),
          finishedAt: null,
          errorMessage: null,
        })
        .where(eq(syncRuns.id, Number(syncRunId)));
    },

    async upsertMappedOrder(storeId: number | string, mapped: MappedShopifyOrder) {
      await db.transaction(async (transaction) => {
        const syncTimestamp = new Date();
        const [savedOrder] = await transaction
          .insert(orders)
          .values({
            storeId: Number(storeId),
            shopifyOrderId: mapped.order.shopifyOrderId,
            shopifyOrderNumber: mapped.order.shopifyOrderNumber,
            createdAt: new Date(mapped.order.createdAt),
            updatedAt: new Date(mapped.order.updatedAt),
            customerName: mapped.order.customerName,
            customerEmail: mapped.order.customerEmail,
            countryCode: mapped.order.countryCode,
            currencyCode: mapped.order.currencyCode,
            totalPrice: mapped.order.totalPrice,
            financialStatus: mapped.order.financialStatus,
            fulfillmentStatus: mapped.order.fulfillmentStatus,
            trackingSummary: mapped.order.trackingSummary,
            tagsJson: mapped.order.tagsJson,
            lastSyncedAt: syncTimestamp,
          })
          .onConflictDoUpdate({
            target: [orders.storeId, orders.shopifyOrderId],
            set: {
              shopifyOrderNumber: mapped.order.shopifyOrderNumber,
              createdAt: new Date(mapped.order.createdAt),
              updatedAt: new Date(mapped.order.updatedAt),
              customerName: mapped.order.customerName,
              customerEmail: mapped.order.customerEmail,
              countryCode: mapped.order.countryCode,
              currencyCode: mapped.order.currencyCode,
              totalPrice: mapped.order.totalPrice,
              financialStatus: mapped.order.financialStatus,
              fulfillmentStatus: mapped.order.fulfillmentStatus,
              trackingSummary: mapped.order.trackingSummary,
              tagsJson: mapped.order.tagsJson,
              lastSyncedAt: syncTimestamp,
            },
          })
          .returning({ id: orders.id });

        await transaction
          .delete(orderFulfillments)
          .where(eq(orderFulfillments.orderId, savedOrder.id));

        if (mapped.fulfillments.length > 0) {
          await transaction.insert(orderFulfillments).values(
            mapped.fulfillments.map((fulfillment) => ({
              orderId: savedOrder.id,
              shopifyFulfillmentId: fulfillment.shopifyFulfillmentId,
              status: fulfillment.status,
              carrier: fulfillment.carrier,
              trackingNumber: fulfillment.trackingNumber,
              trackingUrl: fulfillment.trackingUrl,
              fulfilledAt: new Date(fulfillment.fulfilledAt),
              lastSyncedAt: syncTimestamp,
            })),
          );
        }
      });
    },

    async markSyncSucceeded(
      syncRunId: number | string,
      result: { ordersScanned: number; ordersChanged: number },
    ) {
      const [updatedRun] = await db
        .update(syncRuns)
        .set({
          status: "succeeded",
          finishedAt: new Date(),
          ordersScanned: result.ordersScanned,
          ordersChanged: result.ordersChanged,
          errorMessage: null,
        })
        .where(eq(syncRuns.id, Number(syncRunId)))
        .returning({ storeId: syncRuns.storeId });

      if (updatedRun) {
        await db
          .update(stores)
          .set({
            lastSuccessfulSyncAt: new Date(),
            updatedAt: sql`now()`,
          })
          .where(eq(stores.id, updatedRun.storeId));
      }
    },

    async markSyncFailed(syncRunId: number | string, errorMessage: string) {
      await db
        .update(syncRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          errorMessage,
        })
        .where(eq(syncRuns.id, Number(syncRunId)));
    },
  };
}

export async function listOrders(searchParams: URLSearchParams) {
  const filters = parseOrderFilters(searchParams);
  const hasOpenIssue = getOpenIssueExistsSql();
  const hasNotes = getHasNotesExistsSql();
  const whereClause = buildOrderWhereClause(filters);

  const query = db
    .select({
      id: orders.id,
      storeId: orders.storeId,
      storeName: stores.name,
      shopifyOrderNumber: orders.shopifyOrderNumber,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      countryCode: orders.countryCode,
      currencyCode: orders.currencyCode,
      totalPrice: orders.totalPrice,
      financialStatus: orders.financialStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      trackingSummary: orders.trackingSummary,
      hasOpenIssue,
      hasNotes,
      lastSyncedAt: orders.lastSyncedAt,
    })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId));

  return (whereClause ? query.where(whereClause) : query)
    .orderBy(desc(orders.createdAt))
    .limit(100);
}

export async function getOverviewData(searchParams: URLSearchParams) {
  const filters = parseOrderFilters(searchParams);
  const hasOpenIssue = getOpenIssueExistsSql();
  const hasNotes = getHasNotesExistsSql();
  const whereClause = buildOrderWhereClause(filters);

  const query = db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      totalSalesAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)::text`,
      fulfilledOrders: sql<number>`count(*) filter (where ${orders.fulfillmentStatus} = 'FULFILLED')::int`,
      unfulfilledOrders: sql<number>`count(*) filter (
        where coalesce(${orders.fulfillmentStatus}, '') <> 'FULFILLED'
      )::int`,
      openIssuesCount: sql<number>`count(
        distinct case when ${hasOpenIssue} then ${orders.id} else null end
      )::int`,
      ordersWithNotesCount: sql<number>`count(
        distinct case when ${hasNotes} then ${orders.id} else null end
      )::int`,
    })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId));

  const [summary] = await (whereClause ? query.where(whereClause) : query);

  return {
    filters,
    totalOrders: summary?.totalOrders ?? 0,
    totalSalesAmount: summary?.totalSalesAmount ?? "0",
    fulfilledOrders: summary?.fulfilledOrders ?? 0,
    unfulfilledOrders: summary?.unfulfilledOrders ?? 0,
    openIssuesCount: summary?.openIssuesCount ?? 0,
    ordersWithNotesCount: summary?.ordersWithNotesCount ?? 0,
  };
}

export async function getDashboardPageData(searchParams: URLSearchParams) {
  const [overview, orderRows, storeRows] = await Promise.all([
    getOverviewData(searchParams),
    listOrders(searchParams),
    db
      .select({
        id: stores.id,
        key: stores.key,
        name: stores.name,
        status: stores.status,
      })
      .from(stores)
      .orderBy(stores.name),
  ]);

  return {
    filters: overview.filters,
    stores: storeRows,
    overview,
    orders: orderRows,
  };
}

export async function getOrderDetail(orderId: number) {
  const [orderRow] = await db
    .select({
      id: orders.id,
      storeId: orders.storeId,
      storeName: stores.name,
      shopifyOrderId: orders.shopifyOrderId,
      shopifyOrderNumber: orders.shopifyOrderNumber,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      countryCode: orders.countryCode,
      currencyCode: orders.currencyCode,
      totalPrice: orders.totalPrice,
      financialStatus: orders.financialStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      trackingSummary: orders.trackingSummary,
      tagsJson: orders.tagsJson,
      lastSyncedAt: orders.lastSyncedAt,
      storeLastSuccessfulSyncAt: stores.lastSuccessfulSyncAt,
    })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!orderRow) {
    return null;
  }

  const [fulfillments, notes, issues] = await Promise.all([
    db
      .select()
      .from(orderFulfillments)
      .where(eq(orderFulfillments.orderId, orderId))
      .orderBy(desc(orderFulfillments.fulfilledAt)),
    listNotesForOrder(orderId),
    listIssuesForOrder(orderId),
  ]);

  return {
    ...orderRow,
    fulfillments,
    notes,
    issues,
  };
}

export async function listSyncRuns(limit = 20) {
  return db
    .select({
      id: syncRuns.id,
      storeId: syncRuns.storeId,
      storeName: stores.name,
      triggerType: syncRuns.triggerType,
      status: syncRuns.status,
      startedAt: syncRuns.startedAt,
      finishedAt: syncRuns.finishedAt,
      ordersScanned: syncRuns.ordersScanned,
      ordersChanged: syncRuns.ordersChanged,
      errorMessage: syncRuns.errorMessage,
    })
    .from(syncRuns)
    .innerJoin(stores, eq(stores.id, syncRuns.storeId))
    .orderBy(desc(syncRuns.startedAt))
    .limit(limit);
}
