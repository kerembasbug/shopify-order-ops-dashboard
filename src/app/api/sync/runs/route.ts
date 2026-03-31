import { NextResponse } from "next/server";
import { isDashboardAuthError, requireDashboardSession } from "@/server/http";
import { listSyncRuns } from "@/server/orders/order-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireDashboardSession();
    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;
    const runs = await listSyncRuns(Number.isFinite(limit) ? limit : 20);

    return NextResponse.json({ runs });
  } catch (error) {
    if (isDashboardAuthError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
