import { describe, expect, it, vi } from "vitest";
import { refreshOverviewSnapshot } from "@/server/orders/overview";

describe("refreshOverviewSnapshot", () => {
  it("replaces the current store snapshot with freshly aggregated metrics", async () => {
    const loadOverviewMetrics = vi.fn().mockResolvedValue({
      totalOrders: 4,
      totalSalesAmount: "399.96",
      fulfilledOrders: 3,
      unfulfilledOrders: 1,
      openIssuesCount: 2,
      ordersWithNotesCount: 1,
    });
    const replaceOverviewSnapshot = vi.fn().mockResolvedValue(undefined);

    await refreshOverviewSnapshot(1, {
      loadOverviewMetrics,
      replaceOverviewSnapshot,
    });

    expect(loadOverviewMetrics).toHaveBeenCalledWith(1);
    expect(replaceOverviewSnapshot).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        storeId: 1,
        totalOrders: 4,
        totalSalesAmount: "399.96",
        fulfilledOrders: 3,
        unfulfilledOrders: 1,
        openIssuesCount: 2,
        ordersWithNotesCount: 1,
        capturedAt: expect.any(Date),
      }),
    );
  });
});
