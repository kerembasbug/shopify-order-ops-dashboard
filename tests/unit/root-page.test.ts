import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const getEnvMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/server/env", () => ({
  getEnv: getEnvMock,
}));

describe("HomePage auth protection", () => {
  beforeEach(() => {
    globalThis.React = React;
    cookiesMock.mockReset();
    redirectMock.mockClear();
    getEnvMock.mockReset();
    getEnvMock.mockReturnValue({
      appSessionSecret: "12345678901234567890123456789012",
    });
  });

  it("redirects unauthenticated requests to /login", async () => {
    cookiesMock.mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const { default: HomePage } = await import("@/app/page");

    await expect(
      Promise.resolve().then(() => HomePage()),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  }, 15_000);

  it("redirects forged or invalid session cookies to /login", async () => {
    cookiesMock.mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "forged-token" }),
    });

    const { default: HomePage } = await import("@/app/page");

    await expect(
      Promise.resolve().then(() => HomePage()),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  }, 15_000);
});

describe("buildOverviewCards", () => {
  beforeEach(() => {
    globalThis.React = React;
  });

  it("builds revenue-first summary cards with comparison and empty states", async () => {
    const { buildOverviewCards } = await import("@/components/dashboard/build-overview-cards");

    const mixedCurrencyCards = buildOverviewCards({
      filters: {
        storeId: 42,
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
      },
      comparisonRange: {
        currentFrom: "2026-01-01",
        currentTo: "2026-01-31",
        previousFrom: "2025-12-01",
        previousTo: "2025-12-31",
      },
      totalOrders: 12,
      totalSalesAmount: "1250.5",
      previousSalesAmount: "900.25",
      currencyCodes: ["USD"],
      previousCurrencyCodes: ["USD", "EUR"],
      deltaDirection: "up",
      deltaPercentageLabel: "+38.9%",
      fulfilledOrders: 8,
      unfulfilledOrders: 4,
      openIssuesCount: 2,
      ordersWithNotesCount: 1,
      chargebackOrdersCount: 2,
    });

    const revenueCard = mixedCurrencyCards.find((card) => card.label === "Total Revenue");
    const ordersCard = mixedCurrencyCards.find((card) => card.label === "Orders");
    const aovCard = mixedCurrencyCards.find((card) => card.label === "Average Order Value");
    const chargebackCard = mixedCurrencyCards.find((card) => card.label === "Chargeback Watch");

    expect(revenueCard?.value).toBe("$1,250.50");
    expect(revenueCard?.hint).toContain("Current period");
    expect(revenueCard?.trend?.direction).toBe("up");
    expect(ordersCard?.value).toBe("12");
    expect(aovCard?.value).toBe("$104.21");
    expect(chargebackCard?.value).toBe("2");
    expect(chargebackCard?.tone).toBe("danger");

    const emptyCards = buildOverviewCards({
      filters: {
        storeId: null,
        dateFrom: null,
        dateTo: null,
      },
      comparisonRange: {
        currentFrom: "2026-01-01",
        currentTo: "2026-01-31",
        previousFrom: "2025-12-01",
        previousTo: "2025-12-31",
      },
      totalOrders: 0,
      totalSalesAmount: "0",
      previousSalesAmount: "0",
      currencyCodes: [],
      previousCurrencyCodes: [],
      deltaDirection: "flat",
      deltaPercentageLabel: "0%",
      fulfilledOrders: 0,
      unfulfilledOrders: 0,
      openIssuesCount: 0,
      ordersWithNotesCount: 0,
      chargebackOrdersCount: 0,
    });

    const emptyRevenueCard = emptyCards.find((card) => card.label === "Total Revenue");
    const emptyAovCard = emptyCards.find((card) => card.label === "Average Order Value");

    expect(emptyRevenueCard?.value).toBe("—");
    expect(emptyRevenueCard?.hint).toBe("No orders in the current result set");
    expect(emptyAovCard?.value).toBe("—");
  });
});
