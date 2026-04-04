import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

function collectDateParams(value: unknown, dates: Date[] = []) {
  if (!value || typeof value !== "object") {
    return dates;
  }

  if ("value" in value && value.value instanceof Date) {
    dates.push(value.value);
  }

  if ("queryChunks" in value && Array.isArray(value.queryChunks)) {
    for (const chunk of value.queryChunks) {
      collectDateParams(chunk, dates);
    }
  }

  return dates;
}

function getDateBounds(whereClause: unknown) {
  return collectDateParams(whereClause).map((value) => value.toISOString());
}

function createStoreRowsBuilder() {
  return {
    from: () => ({
      orderBy: () =>
        Promise.resolve([
          {
            id: 1,
            key: "alpha",
            name: "Alpha Store",
            status: "active",
          },
        ]),
    }),
  };
}

describe("order-service overview orchestration", () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
  });

  it("uses the same effective current window for dashboard overview and orders when dates are partial", async () => {
    const currentBounds = [
      "2026-03-15T00:00:00.000Z",
      "2026-03-15T23:59:59.999Z",
    ];
    const previousBounds = [
      "2026-03-14T00:00:00.000Z",
      "2026-03-14T23:59:59.999Z",
    ];

    selectMock.mockImplementation((selection: Record<string, unknown>) => {
      const keys = Object.keys(selection ?? {});

      if (keys.includes("totalOrders")) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: (whereClause: unknown) => {
                const bounds = getDateBounds(whereClause);

                if (
                  bounds[0] === currentBounds[0] &&
                  bounds[1] === currentBounds[1]
                ) {
                  return Promise.resolve([
                    {
                      totalOrders: 1,
                      totalSalesAmount: "50.00",
                      fulfilledOrders: 1,
                      unfulfilledOrders: 0,
                      openIssuesCount: 0,
                      ordersWithNotesCount: 0,
                      currencyCodes: ["USD"],
                    },
                  ]);
                }

                if (
                  bounds[0] === previousBounds[0] &&
                  bounds[1] === previousBounds[1]
                ) {
                  return Promise.resolve([
                    {
                      totalOrders: 1,
                      totalSalesAmount: "40.00",
                      fulfilledOrders: 1,
                      unfulfilledOrders: 0,
                      openIssuesCount: 0,
                      ordersWithNotesCount: 0,
                      currencyCodes: ["USD"],
                    },
                  ]);
                }

                return Promise.resolve([
                  {
                    totalOrders: 99,
                    totalSalesAmount: "9999.00",
                    fulfilledOrders: 99,
                    unfulfilledOrders: 0,
                    openIssuesCount: 0,
                    ordersWithNotesCount: 0,
                    currencyCodes: ["USD"],
                  },
                ]);
              },
            }),
          }),
        };
      }

      if (keys.includes("shopifyOrderNumber")) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: (whereClause: unknown) => {
                const bounds = getDateBounds(whereClause);

                return {
                  orderBy: () => ({
                    limit: () =>
                      Promise.resolve(
                        bounds[0] === currentBounds[0] &&
                          bounds[1] === currentBounds[1]
                          ? [
                              {
                                id: 101,
                                storeId: 1,
                                storeName: "Alpha Store",
                                shopifyOrderNumber: 1001,
                                createdAt: new Date("2026-03-15T10:00:00.000Z"),
                                updatedAt: new Date("2026-03-15T10:00:00.000Z"),
                                customerName: "Ada Lovelace",
                                customerEmail: "ada@example.com",
                                countryCode: "US",
                                currencyCode: "USD",
                                totalPrice: "50.00",
                                financialStatus: "PAID",
                                fulfillmentStatus: "FULFILLED",
                                trackingSummary: null,
                                hasOpenIssue: false,
                                hasNotes: false,
                                lastSyncedAt: new Date("2026-03-15T12:00:00.000Z"),
                              },
                            ]
                          : [
                              {
                                id: 101,
                                storeId: 1,
                                storeName: "Alpha Store",
                                shopifyOrderNumber: 1001,
                                createdAt: new Date("2026-03-15T10:00:00.000Z"),
                                updatedAt: new Date("2026-03-15T10:00:00.000Z"),
                                customerName: "Ada Lovelace",
                                customerEmail: "ada@example.com",
                                countryCode: "US",
                                currencyCode: "USD",
                                totalPrice: "50.00",
                                financialStatus: "PAID",
                                fulfillmentStatus: "FULFILLED",
                                trackingSummary: null,
                                hasOpenIssue: false,
                                hasNotes: false,
                                lastSyncedAt: new Date("2026-03-15T12:00:00.000Z"),
                              },
                              {
                                id: 102,
                                storeId: 1,
                                storeName: "Alpha Store",
                                shopifyOrderNumber: 1002,
                                createdAt: new Date("2026-03-16T10:00:00.000Z"),
                                updatedAt: new Date("2026-03-16T10:00:00.000Z"),
                                customerName: "Grace Hopper",
                                customerEmail: "grace@example.com",
                                countryCode: "US",
                                currencyCode: "USD",
                                totalPrice: "60.00",
                                financialStatus: "PAID",
                                fulfillmentStatus: "UNFULFILLED",
                                trackingSummary: null,
                                hasOpenIssue: false,
                                hasNotes: false,
                                lastSyncedAt: new Date("2026-03-16T12:00:00.000Z"),
                              },
                            ],
                      ),
                  }),
                };
              },
            }),
          }),
        };
      }

      return createStoreRowsBuilder();
    });

    const { getDashboardPageData } = await import("@/server/orders/order-service");
    const result = await getDashboardPageData(
      new URLSearchParams({
        from: "2026-03-15",
      }),
    );

    expect(result.filters.dateFrom).toBe("2026-03-15");
    expect(result.filters.dateTo).toBe("2026-03-15");
    expect(result.overview.totalOrders).toBe(1);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.shopifyOrderNumber).toBe(1001);
  });

  it("returns a safe delta label when the period totals are not currency-comparable", async () => {
    const currentBounds = [
      "2026-03-01T00:00:00.000Z",
      "2026-03-07T23:59:59.999Z",
    ];
    const previousBounds = [
      "2026-02-22T00:00:00.000Z",
      "2026-02-28T23:59:59.999Z",
    ];

    selectMock.mockImplementation((selection: Record<string, unknown>) => {
      const keys = Object.keys(selection ?? {});

      if (keys.includes("totalOrders")) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: (whereClause: unknown) => {
                const bounds = getDateBounds(whereClause);

                if (
                  bounds[0] === currentBounds[0] &&
                  bounds[1] === currentBounds[1]
                ) {
                  return Promise.resolve([
                    {
                      totalOrders: 2,
                      totalSalesAmount: "300.00",
                      fulfilledOrders: 1,
                      unfulfilledOrders: 1,
                      openIssuesCount: 0,
                      ordersWithNotesCount: 0,
                      currencyCodes: ["USD", "EUR"],
                    },
                  ]);
                }

                if (
                  bounds[0] === previousBounds[0] &&
                  bounds[1] === previousBounds[1]
                ) {
                  return Promise.resolve([
                    {
                      totalOrders: 1,
                      totalSalesAmount: "100.00",
                      fulfilledOrders: 1,
                      unfulfilledOrders: 0,
                      openIssuesCount: 0,
                      ordersWithNotesCount: 0,
                      currencyCodes: ["USD"],
                    },
                  ]);
                }

                return Promise.resolve([
                  {
                    totalOrders: 0,
                    totalSalesAmount: "0",
                    fulfilledOrders: 0,
                    unfulfilledOrders: 0,
                    openIssuesCount: 0,
                    ordersWithNotesCount: 0,
                    currencyCodes: [],
                  },
                ]);
              },
            }),
          }),
        };
      }

      return createStoreRowsBuilder();
    });

    const { getOverviewData } = await import("@/server/orders/order-service");
    const result = await getOverviewData(
      new URLSearchParams({
        from: "2026-03-01",
        to: "2026-03-07",
      }),
    );

    expect(result.deltaDirection).toBe("flat");
    expect(result.deltaPercentageLabel).toBe("Multi-currency");
    expect(result.totalSalesAmount).toBe("300.00");
    expect(result.previousSalesAmount).toBe("100.00");
  });
});
