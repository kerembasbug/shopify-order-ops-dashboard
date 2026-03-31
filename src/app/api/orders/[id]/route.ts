import { NextResponse } from "next/server";
import { isDashboardAuthError, requireDashboardSession } from "@/server/http";
import { getOrderDetail } from "@/server/orders/order-service";

export const dynamic = "force-dynamic";

type OrderRouteContext = {
  params: {
    id: string;
  };
};

function parseOrderId(rawId: string) {
  const orderId = Number.parseInt(rawId, 10);
  return Number.isFinite(orderId) ? orderId : null;
}

export async function GET(_request: Request, context: OrderRouteContext) {
  try {
    await requireDashboardSession();
    const orderId = parseOrderId(context.params.id);

    if (!orderId) {
      return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });
    }

    const order = await getOrderDetail(orderId);

    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    if (isDashboardAuthError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
