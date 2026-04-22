import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrdersTable } from "@/components/dashboard/orders-table";
import { OrderDetailSheet } from "@/components/dashboard/order-detail-sheet";
import { StatusPill } from "@/components/shared/status-pill";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";
import { getDashboardPageData, getOrderDetail } from "@/server/orders/order-service";
import { formatCurrency } from "@/components/dashboard/dashboard-utils";

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

function parseOrderId(params: URLSearchParams) {
  const v = params.get("orderId");
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default async function ChargebacksPage({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) redirect("/login");
  const session = await getSessionFromToken(sessionToken, getEnv().appSessionSecret);
  if (!session) redirect("/login");

  // Force chargeback filter on
  const resolvedParams = (await Promise.resolve(searchParams ?? {})) as PageSearchParams;
  const urlParams = toURLSearchParams(resolvedParams);
  urlParams.set("chargeback", "true");

  // Default to last 30 days if no date set
  if (!urlParams.get("from") && !urlParams.get("to")) {
    const today = new Date();
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 29));
    urlParams.set("from", from.toISOString().slice(0, 10));
    urlParams.set("to", today.toISOString().slice(0, 10));
  }

  const currentQuery = urlParams.toString();
  const selectedOrderId = parseOrderId(urlParams);

  const [data, selectedOrder] = await Promise.allSettled([
    getDashboardPageData(urlParams),
    selectedOrderId ? getOrderDetail(selectedOrderId) : Promise.resolve(null),
  ]);

  const { orders = [], overview } = data.status === "fulfilled" ? data.value : {};
  const orderDetail = selectedOrder.status === "fulfilled" ? selectedOrder.value : null;

  const totalChargebackAmount = orders.reduce((sum, o) => {
    return sum + (Number.parseFloat(o.totalPrice) || 0);
  }, 0);

  const currencies = [...new Set(orders.map((o) => o.currencyCode).filter(Boolean))];
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;

  return (
    <div>
      <div className="top-bar">
        <div className="top-bar__title">
          <h1>Chargebacks</h1>
          <p className="top-bar__subtitle">Orders tagged with dispute or chargeback</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <div className="kpi-card kpi-card--coral">
          <div className="kpi-card__label">
            <span>Chargeback Orders</span>
            <StatusPill label="Active" tone="danger" />
          </div>
          <div className="kpi-card__value" style={{ color: "var(--accent-coral)" }}>
            {orders.length}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Chargeback-tagged orders</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">
            <span>Total Amount at Risk</span>
          </div>
          <div className="kpi-card__value">
            {singleCurrency
              ? formatCurrency(totalChargebackAmount, singleCurrency)
              : `${orders.length} orders`}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {currencies.length > 1 ? "Multi-currency" : `In ${singleCurrency ?? "—"}`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">
            <span>Open Issues</span>
          </div>
          <div className="kpi-card__value">{overview?.openIssuesCount ?? 0}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Issues in this period
          </div>
        </div>
      </div>

      {/* Notice */}
      <div style={{ padding: "12px 16px", marginBottom: "20px", background: "var(--accent-coral-soft)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--radius-md)", fontSize: "13px", color: "var(--accent-coral)" }}>
        <strong>⚠ Dispute watchlist.</strong> These orders carry a <code>chargeback</code>, <code>charge back</code>, or <code>dispute</code> tag in Shopify. Click any row for the full detail and customer timeline.
      </div>

      {/* Table */}
      <OrdersTable rows={orders} currentQuery={currentQuery} selectedOrderId={selectedOrderId} />

      {selectedOrderId !== null && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          order={orderDetail}
          currentQuery={currentQuery}
          basePath="/chargebacks"
        />
      )}
    </div>
  );
}
