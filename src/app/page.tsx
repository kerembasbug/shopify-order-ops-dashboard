import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/dashboard/app-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { OrderDetailSheet } from "@/components/dashboard/order-detail-sheet";
import { OrdersTable } from "@/components/dashboard/orders-table";
import { OverviewStrip, type OverviewCard } from "@/components/dashboard/overview-strip";
import { SyncStatusCard } from "@/components/dashboard/sync-status-card";
import { formatCurrencyScope, formatDate } from "@/components/dashboard/dashboard-utils";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";
import { parseOrderFilters } from "@/server/orders/filters";
import {
  getDashboardPageData,
  getOrderDetail,
  listSyncRuns,
} from "@/server/orders/order-service";

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
};

type OverviewData = Awaited<ReturnType<typeof getDashboardPageData>>["overview"];

function toURLSearchParams(searchParams: PageSearchParams) {
  const normalized = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      const lastValue = value.at(-1);

      if (lastValue) {
        normalized.set(key, lastValue);
      }

      continue;
    }

    if (value) {
      normalized.set(key, value);
    }
  }

  return normalized;
}

function parseOrderId(searchParams: URLSearchParams) {
  const value = searchParams.get("orderId");

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildEmptyDashboardData(searchParams: URLSearchParams) {
  const filters = parseOrderFilters(searchParams);

  return {
    filters,
    stores: [] as Array<{
      id: number;
      key: string;
      name: string;
      status: string;
    }>,
    overview: {
      filters,
      comparisonRange: {
        currentFrom: filters.dateFrom ?? "",
        currentTo: filters.dateTo ?? "",
        previousFrom: filters.dateFrom ?? "",
        previousTo: filters.dateTo ?? "",
      },
      totalOrders: 0,
      totalSalesAmount: "0",
      previousSalesAmount: "0",
      currencyCodes: [],
      deltaDirection: "flat" as const,
      deltaPercentageLabel: "0%",
      fulfilledOrders: 0,
      unfulfilledOrders: 0,
      openIssuesCount: 0,
      ordersWithNotesCount: 0,
    },
    orders: [] as Array<{
      id: number;
      storeId: number;
      storeName: string;
      shopifyOrderNumber: number;
      createdAt: Date | string;
      updatedAt: Date | string;
      customerName: string | null;
      customerEmail: string | null;
      countryCode: string | null;
      currencyCode: string | null;
      totalPrice: string;
      financialStatus: string | null;
      fulfillmentStatus: string | null;
      trackingSummary: string | null;
      hasOpenIssue: boolean;
      hasNotes: boolean;
      lastSyncedAt: Date | string | null;
    }>,
  };
}

function describeComparisonRange(from: string, to: string) {
  return `${formatDate(from)} to ${formatDate(to)}`;
}

function buildSalesCard(
  amount: string,
  currencyCodes: string[],
  rangeLabel: string,
  periodLabel: string,
) {
  return formatCurrencyScope(amount, currencyCodes, `${periodLabel}: ${rangeLabel}`);
}

export function buildOverviewCards(overview: OverviewData): OverviewCard[] {
  const currentRangeLabel = describeComparisonRange(
    overview.comparisonRange.currentFrom,
    overview.comparisonRange.currentTo,
  );
  const previousRangeLabel = describeComparisonRange(
    overview.comparisonRange.previousFrom,
    overview.comparisonRange.previousTo,
  );

  return [
    {
      label: "Selected Sales",
      ...buildSalesCard(
        overview.totalSalesAmount,
        overview.currencyCodes,
        currentRangeLabel,
        "Current period",
      ),
      tone: "accent" as const,
    },
    {
      label: "Previous Sales",
      ...buildSalesCard(
        overview.previousSalesAmount,
        overview.currencyCodes,
        previousRangeLabel,
        "Previous period",
      ),
      tone: "default" as const,
    },
    {
      label: "Growth",
      value: overview.deltaPercentageLabel,
      hint: `Compared with ${previousRangeLabel}`,
      tone:
        overview.deltaDirection === "up"
          ? ("success" as const)
          : overview.deltaDirection === "down"
            ? ("danger" as const)
            : ("default" as const),
      trend: {
        direction: overview.deltaDirection,
        label: "Compared with previous period",
      },
    },
    {
      label: "Orders",
      value: overview.totalOrders.toLocaleString("en-US"),
      hint: `Orders in ${currentRangeLabel}`,
      tone: "default" as const,
    },
    {
      label: "Fulfilled",
      value: overview.fulfilledOrders.toLocaleString("en-US"),
      hint: `Fulfilled orders in ${currentRangeLabel}`,
      tone: "success" as const,
    },
    {
      label: "Unfulfilled",
      value: overview.unfulfilledOrders.toLocaleString("en-US"),
      hint: `Unfulfilled orders in ${currentRangeLabel}`,
      tone: "default" as const,
    },
    {
      label: "Open Issues",
      value: overview.openIssuesCount.toLocaleString("en-US"),
      hint: `Open issues in ${currentRangeLabel}`,
      tone: overview.openIssuesCount > 0 ? "danger" : "default",
    },
  ];
}

function getActiveStoreLabel(
  stores: Awaited<ReturnType<typeof getDashboardPageData>>["stores"],
  storeId: number | null,
) {
  if (!storeId) {
    return "All active stores";
  }

  return stores.find((store) => store.id === storeId)?.name ?? `Store #${storeId}`;
}

async function loadDashboardState(searchParams: URLSearchParams) {
  const selectedOrderId = parseOrderId(searchParams);
  const [dashboardResult, syncRunsResult, orderDetailResult] = await Promise.allSettled([
    getDashboardPageData(searchParams),
    listSyncRuns(6),
    selectedOrderId ? getOrderDetail(selectedOrderId) : Promise.resolve(null),
  ]);
  const warnings: string[] = [];

  if (dashboardResult.status === "rejected") {
    warnings.push("Live order data could not be loaded. Showing an empty dashboard shell.");
  }

  if (syncRunsResult.status === "rejected") {
    warnings.push("Recent sync history is temporarily unavailable.");
  }

  if (orderDetailResult.status === "rejected") {
    warnings.push("The selected order detail could not be loaded.");
  }

  return {
    selectedOrderId,
    warnings,
    dashboardData:
      dashboardResult.status === "fulfilled"
        ? dashboardResult.value
        : buildEmptyDashboardData(searchParams),
    syncRuns: syncRunsResult.status === "fulfilled" ? syncRunsResult.value : [],
    selectedOrder: orderDetailResult.status === "fulfilled" ? orderDetailResult.value : null,
  };
}

export default async function HomePage(props: HomePageProps) {
  const { searchParams } = props ?? {};
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const session = await getSessionFromToken(
    sessionToken,
    getEnv().appSessionSecret,
  );

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = (await Promise.resolve(searchParams ?? {})) as PageSearchParams;
  const normalizedSearchParams = toURLSearchParams(resolvedSearchParams);
  const currentQuery = normalizedSearchParams.toString();
  const { dashboardData, selectedOrder, selectedOrderId, syncRuns, warnings } =
    await loadDashboardState(normalizedSearchParams);
  const activeStoreLabel = getActiveStoreLabel(
    dashboardData.stores,
    dashboardData.filters.storeId,
  );
  const activeStoreCount = dashboardData.stores.filter((store) => store.status === "active").length;

  return (
    <main className="dashboard-shell">
      <AppHeader
        storeCount={activeStoreCount || dashboardData.stores.length}
        activeStoreLabel={activeStoreLabel}
      />

      {warnings.map((warning) => (
        <section key={warning} className="warning-banner" role="status">
          {warning}
        </section>
      ))}

      <OverviewStrip cards={buildOverviewCards(dashboardData.overview)} />

      <div className="dashboard-grid">
        <section className="dashboard-main">
          <FilterBar filters={dashboardData.filters} stores={dashboardData.stores} />
          <OrdersTable
            rows={dashboardData.orders}
            currentQuery={currentQuery}
            selectedOrderId={selectedOrderId}
          />
        </section>

        <section className="dashboard-side">
          <SyncStatusCard runs={syncRuns} />
          <OrderDetailSheet
            orderId={selectedOrderId}
            order={selectedOrder}
            currentQuery={currentQuery}
          />
        </section>
      </div>
    </main>
  );
}
