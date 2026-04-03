import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const whereMock = vi.fn();
const resolveComparisonRangeMock = vi.fn();
const getDeltaStateMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/server/orders/comparison", () => ({
  resolveComparisonRange: resolveComparisonRangeMock,
  getDeltaState: getDeltaStateMock,
}));

describe("getOverviewData", () => {
  beforeEach(() => {
    selectMock.mockReset();
    whereMock.mockReset();
    resolveComparisonRangeMock.mockReset();
    getDeltaStateMock.mockReset();

    selectMock.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: whereMock,
        }),
      }),
    }));
  });

  it("normalizes returned filters to the resolved current comparison window", async () => {
    resolveComparisonRangeMock.mockReturnValue({
      currentFrom: "2026-03-05",
      currentTo: "2026-04-03",
      previousFrom: "2026-02-03",
      previousTo: "2026-03-04",
    });
    whereMock
      .mockResolvedValueOnce([
        {
          totalOrders: 3,
          totalSalesAmount: "300.00",
          fulfilledOrders: 2,
          unfulfilledOrders: 1,
          openIssuesCount: 0,
          ordersWithNotesCount: 1,
          currencyCodes: ["USD"],
        },
      ])
      .mockResolvedValueOnce([
        {
          totalOrders: 1,
          totalSalesAmount: "120.00",
          fulfilledOrders: 1,
          unfulfilledOrders: 0,
          openIssuesCount: 0,
          ordersWithNotesCount: 0,
          currencyCodes: ["USD"],
        },
      ]);
    getDeltaStateMock.mockReturnValue({
      direction: "up",
      percentageLabel: "150.0%",
    });

    const { getOverviewData } = await import("@/server/orders/order-service");
    const result = await getOverviewData(new URLSearchParams());

    expect(result.filters.dateFrom).toBe("2026-03-05");
    expect(result.filters.dateTo).toBe("2026-04-03");
    expect(result.comparisonRange).toEqual({
      currentFrom: "2026-03-05",
      currentTo: "2026-04-03",
      previousFrom: "2026-02-03",
      previousTo: "2026-03-04",
    });
  });
});
