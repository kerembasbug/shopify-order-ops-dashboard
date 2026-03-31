import { NextResponse } from "next/server";
import { getEnv } from "@/server/env";
import { createSyncRunsForSelection } from "@/server/orders/order-service";
import { enqueueStoreSync } from "@/server/queue";

export async function POST(request: Request) {
  const env = getEnv();
  const header = request.headers.get("x-internal-cron-secret");

  if (header !== env.internalCronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const syncRuns = await createSyncRunsForSelection({
    triggerType: "scheduled",
  });

  for (const run of syncRuns) {
    await enqueueStoreSync(run);
  }

  return NextResponse.json({ queued: syncRuns.length });
}
