import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { OrdersTable } from "@/components/dashboard/orders-table";
import { OrderDetailSheet } from "@/components/dashboard/order-detail-sheet";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";
import { parseOrderFilters } from "@/server/orders/filters";
import { getDashboardPageData, getOrderDetail } from "@/server/orders/order-service";

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

export default async function OrdersPage({
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
  const currentQuery = urlParams.toString();
  const selectedOrderId = parseOrderId(urlParams);

  const [data, selectedOrder] = await Promise.allSettled([
    getDashboardPageData(urlParams),
    selectedOrderId ? getOrderDetail(selectedOrderId) : Promise.resolve(null),
  ]);

  const { orders = [], stores = [], filters = parseOrderFilters(urlParams) } =
    data.status === "fulfilled" ? data.value : {};

  const orderDetail =
    selectedOrder.status === "fulfilled" ? selectedOrder.value : null;

  return (
    <div>
      <div className="top-bar">
        <div className="top-bar__title">
          <h1>Orders</h1>
          <p className="top-bar__subtitle">
            {stores.filter((s) => s.status === "active").length} active stores
          </p>
        </div>
      </div>

      <FilterBar stores={stores} filters={filters} basePath="/orders" />
      <OrdersTable rows={orders} currentQuery={currentQuery} selectedOrderId={selectedOrderId} />

      {selectedOrderId !== null && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          order={orderDetail}
          currentQuery={currentQuery}
          basePath="/orders"
        />
      )}
    </div>
  );
}
