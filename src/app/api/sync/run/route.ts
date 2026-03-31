import { NextResponse } from "next/server";
import { isDashboardAuthError, requireDashboardSession } from "@/server/http";
import { createSyncRunsForSelection } from "@/server/orders/order-service";
import { enqueueStoreSync } from "@/server/queue";

export async function POST(request: Request) {
  try {
    await requireDashboardSession();
    const body = (await request.json().catch(() => ({}))) as {
      storeId?: number | null;
    };
    const syncRuns = await createSyncRunsForSelection({
      storeId: typeof body.storeId === "number" ? body.storeId : null,
      triggerType: "manual",
    });

    for (const run of syncRuns) {
      await enqueueStoreSync(run);
    }

    return NextResponse.json({ queued: syncRuns.length });
  } catch (error) {
    if (isDashboardAuthError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
