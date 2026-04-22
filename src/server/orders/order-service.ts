import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { ensureDatabaseCompatibility } from "@/db/compatibility";
import { db } from "@/db";
import {
  orderFulfillments,
  orderCustomerEvents,
  orderIssues,
  orderNotes,
  orders,
  stores,
  syncRuns,
} from "@/db/schema";
import { getEnv } from "@/server/env";
import { getChargebackTagExistsSql } from "@/server/orders/chargeback";
import { listIssuesForOrder } from "@/server/issues/issue-service";
import { listNotesForOrder } from "@/server/notes/note-service";
import {
  getDeltaState,
  resolveComparisonRange,
} from "@/server/orders/comparison";
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

type DateRangeInput = {
  dateFrom: string | null;
  dateTo: string | null;
};

type OverviewSummary = {
  totalOrders: number;
  totalSalesAmount: string;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  openIssuesCount: number;
  ordersWithNotesCount: number;
  chargebackOrdersCount: number;
  currencyCodes: string[];
};

type DailyTrendPoint = {
  date: string;
  totalOrders: number;
  totalSalesAmount: string;
  chargebackOrdersCount: number;
  currencyCodes: string[];
};

type StorePerformancePoint = {
  storeId: number;
  storeName: string;
  totalOrders: number;
  totalSalesAmount: string;
  chargebackOrdersCount: number;
  fulfilledOrders: number;
  currencyCodes: string[];
};

type DashboardAnalytics = {
  dailyTrend: DailyTrendPoint[];
  storeBreakdown: StorePerformancePoint[];
};

function buildNormalizedDateSearchParams(searchParams: URLSearchParams) {
  const filters = parseOrderFilters(searchParams);

  if (filters.dateFrom && filters.dateTo) {
    return searchParams;
  }

  const comparisonRange = resolveComparisonRange(filters);
  const normalized = new URLSearchParams(searchParams);

  normalized.set("from", comparisonRange.currentFrom);
  normalized.set("to", comparisonRange.currentTo);

  return normalized;
}

function isCurrencySafeDelta(
  currentCurrencyCodes: string[],
  previousCurrencyCodes: string[],
) {
  if (currentCurrencyCodes.length > 1 || previousCurrencyCodes.length > 1) {
    return false;
  }

  if (
    currentCurrencyCodes.length === 1 &&
    previousCurrencyCodes.length === 1 &&
    currentCurrencyCodes[0] !== previousCurrencyCodes[0]
  ) {
    return false;
  }

  return true;
}

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

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildDailyTrendSeed(dateRange: DateRangeInput) {
  const createdAfter = buildDateFrom(dateRange.dateFrom);
  const createdBefore = buildDateTo(dateRange.dateTo);

  if (!createdAfter || !createdBefore) {
    return [];
  }

  const points: DailyTrendPoint[] = [];
  const cursor = new Date(createdAfter);

  while (cursor <= createdBefore) {
    points.push({
      date: formatUtcDate(cursor),
      totalOrders: 0,
      totalSalesAmount: "0",
      chargebackOrdersCount: 0,
      currencyCodes: [],
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return points;
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

export function buildSourceSearchCondition(sourceSearch: string) {
  const normalizedSourceSearch = sourceSearch.trim();

  if (!normalizedSourceSearch) {
    return undefined;
  }

  if (normalizedSourceSearch.toLowerCase() === "direct") {
    return sql<boolean>`(
      coalesce(${orders.referrerHost}, '') = ''
      and coalesce(${orders.utmSource}, '') = ''
      and coalesce(${orders.utmMedium}, '') = ''
      and coalesce(${orders.utmCampaign}, '') = ''
    )`;
  }

  const pattern = `%${normalizedSourceSearch}%`;

  return sql<boolean>`(
    coalesce(${orders.salesChannel}, '') ilike ${pattern}
    or coalesce(${orders.referrerHost}, '') ilike ${pattern}
    or coalesce(${orders.utmSource}, '') ilike ${pattern}
    or coalesce(${orders.utmMedium}, '') ilike ${pattern}
    or coalesce(${orders.utmCampaign}, '') ilike ${pattern}
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

function buildOrderWhereClause(
  filters: ReturnType<typeof parseOrderFilters>,
  dateRange: DateRangeInput = filters,
) {
  const openIssueExists = getOpenIssueExistsSql();
  const hasNotesExists = getHasNotesExistsSql();
  const hasChargebackTag = getChargebackTagExistsSql();
  const createdAfter = buildDateFrom(dateRange.dateFrom);
  const createdBefore = buildDateTo(dateRange.dateTo);

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
    filters.hasChargeback ? hasChargebackTag : undefined,
    buildSearchCondition(filters.search),
    buildSourceSearchCondition(filters.sourceSearch),
    createdAfter ? gte(orders.createdAt, createdAfter) : undefined,
    createdBefore ? lte(orders.createdAt, createdBefore) : undefined,
  );
}

async function loadOverviewSummary(
  filters: ReturnType<typeof parseOrderFilters>,
  dateRange: DateRangeInput,
): Promise<OverviewSummary> {
  const hasOpenIssue = getOpenIssueExistsSql();
  const hasNotes = getHasNotesExistsSql();
  const hasChargebackTag = getChargebackTagExistsSql();
  const whereClause = buildOrderWhereClause(filters, dateRange);

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
      chargebackOrdersCount: sql<number>`count(
        distinct case when ${hasChargebackTag} then ${orders.id} else null end
      )::int`,
      currencyCodes: sql<string[]>`coalesce(
        array_agg(distinct ${orders.currencyCode}) filter (
          where ${orders.currencyCode} is not null
        ),
        '{}'::text[]
      )`,
    })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId));

  const [summary] = await (whereClause ? query.where(whereClause) : query);

  return {
    totalOrders: summary?.totalOrders ?? 0,
    totalSalesAmount: summary?.totalSalesAmount ?? "0",
    fulfilledOrders: summary?.fulfilledOrders ?? 0,
    unfulfilledOrders: summary?.unfulfilledOrders ?? 0,
    openIssuesCount: summary?.openIssuesCount ?? 0,
    ordersWithNotesCount: summary?.ordersWithNotesCount ?? 0,
    chargebackOrdersCount: summary?.chargebackOrdersCount ?? 0,
    currencyCodes: summary?.currencyCodes ?? [],
  };
}

async function loadDailyTrend(
  filters: ReturnType<typeof parseOrderFilters>,
  dateRange: DateRangeInput,
): Promise<DailyTrendPoint[]> {
  const hasChargebackTag = getChargebackTagExistsSql();
  const whereClause = buildOrderWhereClause(filters, dateRange);
  const dayBucket = sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`;

  const query = db
    .select({
      date: dayBucket,
      orderCount: sql<number>`count(*)::int`,
      salesAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)::text`,
      chargebackCount: sql<number>`count(
        distinct case when ${hasChargebackTag} then ${orders.id} else null end
      )::int`,
      currencyCodes: sql<string[]>`coalesce(
        array_agg(distinct ${orders.currencyCode}) filter (
          where ${orders.currencyCode} is not null
        ),
        '{}'::text[]
      )`,
    })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId));

  const rows = await (whereClause ? query.where(whereClause) : query)
    .groupBy(dayBucket)
    .orderBy(dayBucket);
  const seededTrend = new Map(
    buildDailyTrendSeed(dateRange).map((point) => [point.date, point] as const),
  );

  for (const row of rows) {
    seededTrend.set(row.date, {
      date: row.date,
      totalOrders: row.orderCount,
      totalSalesAmount: row.salesAmount,
      chargebackOrdersCount: row.chargebackCount,
      currencyCodes: row.currencyCodes,
    });
  }

  return Array.from(seededTrend.values());
}

async function loadStoreBreakdown(
  filters: ReturnType<typeof parseOrderFilters>,
  dateRange: DateRangeInput,
): Promise<StorePerformancePoint[]> {
  const hasChargebackTag = getChargebackTagExistsSql();
  const whereClause = buildOrderWhereClause(filters, dateRange);
  const totalSalesAmountSql = sql<number>`coalesce(sum(${orders.totalPrice}), 0)`;

  const query = db
    .select({
      storeId: stores.id,
      storeName: stores.name,
      orderCount: sql<number>`count(*)::int`,
      salesAmount: sql<string>`${totalSalesAmountSql}::text`,
      chargebackCount: sql<number>`count(
        distinct case when ${hasChargebackTag} then ${orders.id} else null end
      )::int`,
      fulfilledCount: sql<number>`count(*) filter (where ${orders.fulfillmentStatus} = 'FULFILLED')::int`,
      currencyCodes: sql<string[]>`coalesce(
        array_agg(distinct ${orders.currencyCode}) filter (
          where ${orders.currencyCode} is not null
        ),
        '{}'::text[]
      )`,
    })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId));

  const rows = await (whereClause ? query.where(whereClause) : query)
    .groupBy(stores.id, stores.name)
    .orderBy(desc(totalSalesAmountSql), stores.name);

  return rows.map((row) => ({
    storeId: row.storeId,
    storeName: row.storeName,
    totalOrders: row.orderCount,
    totalSalesAmount: row.salesAmount,
    chargebackOrdersCount: row.chargebackCount,
    fulfilledOrders: row.fulfilledCount,
    currencyCodes: row.currencyCodes,
  }));
}

async function loadDashboardAnalytics(
  filters: ReturnType<typeof parseOrderFilters>,
  dateRange: DateRangeInput,
): Promise<DashboardAnalytics> {
  const [dailyTrend, storeBreakdown] = await Promise.all([
    loadDailyTrend(filters, dateRange),
    loadStoreBreakdown(filters, dateRange),
  ]);

  return {
    dailyTrend,
    storeBreakdown,
  };
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
      await ensureDatabaseCompatibility();

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
            salesChannel: mapped.order.salesChannel,
            landingPagePath: mapped.order.landingPagePath,
            referrerUrl: mapped.order.referrerUrl,
            referrerHost: mapped.order.referrerHost,
            utmSource: mapped.order.utmSource,
            utmMedium: mapped.order.utmMedium,
            utmCampaign: mapped.order.utmCampaign,
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
              salesChannel: mapped.order.salesChannel,
              landingPagePath: mapped.order.landingPagePath,
              referrerUrl: mapped.order.referrerUrl,
              referrerHost: mapped.order.referrerHost,
              utmSource: mapped.order.utmSource,
              utmMedium: mapped.order.utmMedium,
              utmCampaign: mapped.order.utmCampaign,
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
  await ensureDatabaseCompatibility();

  const filters = parseOrderFilters(searchParams);
  const hasOpenIssue = getOpenIssueExistsSql();
  const hasNotes = getHasNotesExistsSql();
  const hasChargebackTag = getChargebackTagExistsSql();
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
      salesChannel: orders.salesChannel,
      landingPagePath: orders.landingPagePath,
      referrerHost: orders.referrerHost,
      utmSource: orders.utmSource,
      utmMedium: orders.utmMedium,
      utmCampaign: orders.utmCampaign,
      hasOpenIssue,
      hasNotes,
      hasChargeback: hasChargebackTag,
      lastSyncedAt: orders.lastSyncedAt,
    })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId));

  return (whereClause ? query.where(whereClause) : query)
    .orderBy(desc(orders.createdAt))
    .limit(100);
}

export async function getOverviewData(searchParams: URLSearchParams) {
  await ensureDatabaseCompatibility();

  const filters = parseOrderFilters(searchParams);
  const comparisonRange = resolveComparisonRange(filters);
  const [currentSummary, previousSummary, analytics] = await Promise.all([
    loadOverviewSummary(filters, {
      dateFrom: comparisonRange.currentFrom,
      dateTo: comparisonRange.currentTo,
    }),
    loadOverviewSummary(filters, {
      dateFrom: comparisonRange.previousFrom,
      dateTo: comparisonRange.previousTo,
    }),
    loadDashboardAnalytics(filters, {
      dateFrom: comparisonRange.currentFrom,
      dateTo: comparisonRange.currentTo,
    }),
  ]);
  const delta = isCurrencySafeDelta(
    currentSummary.currencyCodes,
    previousSummary.currencyCodes,
  )
    ? getDeltaState(
        currentSummary.totalSalesAmount,
        previousSummary.totalSalesAmount,
      )
    : {
        direction: "flat" as const,
        percentageLabel: "Multi-currency",
      };

  return {
    filters: {
      ...filters,
      dateFrom: comparisonRange.currentFrom,
      dateTo: comparisonRange.currentTo,
    },
    comparisonRange,
    totalOrders: currentSummary.totalOrders,
    totalSalesAmount: currentSummary.totalSalesAmount,
    previousSalesAmount: previousSummary.totalSalesAmount,
    currencyCodes: currentSummary.currencyCodes,
    previousCurrencyCodes: previousSummary.currencyCodes,
    deltaDirection: delta.direction,
    deltaPercentageLabel: delta.percentageLabel,
    fulfilledOrders: currentSummary.fulfilledOrders,
    unfulfilledOrders: currentSummary.unfulfilledOrders,
    openIssuesCount: currentSummary.openIssuesCount,
    ordersWithNotesCount: currentSummary.ordersWithNotesCount,
    chargebackOrdersCount: currentSummary.chargebackOrdersCount,
    analytics,
  };
}

export async function getDashboardPageData(searchParams: URLSearchParams) {
  await ensureDatabaseCompatibility();

  const normalizedSearchParams = buildNormalizedDateSearchParams(searchParams);
  const [overview, orderRows, storeRows] = await Promise.all([
    getOverviewData(normalizedSearchParams),
    listOrders(normalizedSearchParams),
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
  await ensureDatabaseCompatibility();

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
      salesChannel: orders.salesChannel,
      landingPagePath: orders.landingPagePath,
      referrerHost: orders.referrerHost,
      utmSource: orders.utmSource,
      utmMedium: orders.utmMedium,
      utmCampaign: orders.utmCampaign,
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

  const [fulfillments, notes, issues, customerEvents] = await Promise.all([
    db
      .select()
      .from(orderFulfillments)
      .where(eq(orderFulfillments.orderId, orderId))
      .orderBy(desc(orderFulfillments.fulfilledAt)),
    listNotesForOrder(orderId),
    listIssuesForOrder(orderId),
    db
      .select()
      .from(orderCustomerEvents)
      .where(eq(orderCustomerEvents.orderId, orderId))
      .orderBy(desc(orderCustomerEvents.occurredAt), desc(orderCustomerEvents.createdAt)),
  ]);

  return {
    ...orderRow,
    fulfillments,
    notes,
    issues,
    customerEvents,
  };
}

export async function listSyncRuns(limit = 20) {
  await ensureDatabaseCompatibility();

  const activityPriority = sql<number>`case
    when ${syncRuns.status} = 'running' then 0
    when ${syncRuns.status} = 'pending' then 1
    when ${syncRuns.status} = 'failed' then 2
    else 3
  end`;

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
    .orderBy(desc(syncRuns.startedAt), activityPriority)
    .limit(limit);
}
