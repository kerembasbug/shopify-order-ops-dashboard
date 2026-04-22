import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StoreDonut } from "@/components/dashboard/store-donut";
import { MiniOrderList } from "@/components/dashboard/mini-order-list";
import { SyncStatusCard } from "@/components/dashboard/sync-status-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";
import { parseOrderFilters } from "@/server/orders/filters";
import { getDashboardPageData, listSyncRuns } from "@/server/orders/order-service";

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(raw: PageSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const v = Array.isArray(value) ? value.at(-1) : value;
    if (v) params.set(key, v);
  }
  return params;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) redirect("/login");

  const session = await getSessionFromToken(sessionToken, getEnv().appSessionSecret);
  if (!session) redirect("/login");

  const resolvedParams = (await Promise.resolve(searchParams ?? {})) as PageSearchParams;
  const urlParams = toURLSearchParams(resolvedParams);

  // Default to last 30 days for the dashboard home view if no dates provided
  if (!urlParams.has("from") && !urlParams.has("to")) {
    const today = new Date();
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 29));
    urlParams.set("from", from.toISOString().slice(0, 10));
    urlParams.set("to", today.toISOString().slice(0, 10));
  }

  const [data, syncRuns] = await Promise.all([
    getDashboardPageData(urlParams).catch(() => null),
    listSyncRuns(3).catch(() => []),
  ]);

  if (!data) {
    return (
      <div>
        <div className="top-bar">
          <div className="top-bar__title">
            <h1>Dashboard</h1>
            <p className="top-bar__subtitle">Overview</p>
          </div>
        </div>
        <div className="panel">
          <p style={{ color: "var(--accent-coral)", margin: 0 }}>
            Could not load dashboard data. Check your database connection.
          </p>
        </div>
      </div>
    );
  }

  const { overview, orders, stores, filters } = data;
  const activeStoreCount = stores.filter((s) => s.status === "active").length;
  
  // Use a generic previous period string
  const comparisonLabel = "vs previous period";

  return (
    <div>
      {/* Top bar */}
      <div className="top-bar">
        <div className="top-bar__title">
          <h1>Dashboard</h1>
          <p className="top-bar__subtitle">
            {activeStoreCount} active store{activeStoreCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Sync status chips */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {syncRuns.slice(0, 1).map((run) => (
            <div
              key={run.id}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                background:
                  run.status === "succeeded"
                    ? "var(--accent-teal-soft)"
                    : run.status === "failed"
                    ? "var(--accent-coral-soft)"
                    : "var(--bg-glass)",
                color:
                  run.status === "succeeded"
                    ? "var(--accent-teal)"
                    : run.status === "failed"
                    ? "var(--accent-coral)"
                    : "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Sync: {run.status}
            </div>
          ))}
        </div>
      </div>

      <FilterBar stores={stores} filters={filters} basePath="/" />

      {/* KPI Cards */}
      <KpiCards data={{...overview, comparisonLabel}} />

      {/* Main Content Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", marginBottom: "20px" }}>
        
        {/* Left Column (Orders & Charts) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Mini order list elevated to top */}
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel__header" style={{ padding: "20px 20px 0" }}>
              <div>
                <p className="panel__eyebrow">Order Queue</p>
                <h2 className="panel__title" style={{ fontSize: "16px" }}>Recent orders</h2>
              </div>
            </div>
            <MiniOrderList rows={orders} />
          </div>

          {/* Revenue chart */}
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Revenue Trend</p>
                <h2 className="panel__title" style={{ fontSize: "16px" }}>Daily gross sales</h2>
              </div>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-secondary)", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-teal)", display: "inline-block" }} />
                  Revenue
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-coral)", display: "inline-block" }} />
                  Chargeback
                </span>
              </div>
            </div>
            <RevenueChart data={overview.analytics.dailyTrend} />
          </div>
        </div>

        {/* Right Column (Donut & Sync) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Sync status */}
          <SyncStatusCard runs={syncRuns} />
          
          {/* Donut chart */}
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Store Ranking</p>
                <h2 className="panel__title" style={{ fontSize: "16px" }}>By orders</h2>
              </div>
            </div>
            <StoreDonut data={overview.analytics.storeBreakdown} />
          </div>
        </div>
      </div>
    </div>
  );
}
