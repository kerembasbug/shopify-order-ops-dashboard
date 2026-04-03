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

  it("builds comparison-aware cards with separate current, previous, and empty money states", async () => {
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
    });

    const selectedSalesCard = mixedCurrencyCards.find((card) => card.label === "Selected Sales");
    const previousSalesCard = mixedCurrencyCards.find((card) => card.label === "Previous Sales");
    const growthCard = mixedCurrencyCards.find((card) => card.label === "Growth");

    expect(selectedSalesCard?.value).toBe("$1,250.50");
    expect(selectedSalesCard?.hint).toContain("Current period");
    expect(previousSalesCard?.value).toBe("Multi-currency");
    expect(previousSalesCard?.hint).toContain("Currency mix prevents a reliable total.");
    expect(growthCard?.trend?.direction).toBe("up");

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
    });

    const emptySelectedSalesCard = emptyCards.find((card) => card.label === "Selected Sales");

    expect(emptySelectedSalesCard?.value).toBe("—");
    expect(emptySelectedSalesCard?.hint).toBe("No orders in the current result set");
  });
});
