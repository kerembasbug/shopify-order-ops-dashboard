import { NextResponse } from "next/server";
import { isDashboardAuthError, requireDashboardSession } from "@/server/http";
import { getDashboardPageData } from "@/server/orders/order-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireDashboardSession();
    const payload = await getDashboardPageData(new URL(request.url).searchParams);

    return NextResponse.json(payload);
  } catch (error) {
    if (isDashboardAuthError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
