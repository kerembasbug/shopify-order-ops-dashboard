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

  it("builds comparison-aware cards with a multi-currency fallback", async () => {
    const { buildOverviewCards } = await import("@/app/page");

    const cards = buildOverviewCards({
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
      currencyCodes: ["USD", "EUR"],
      deltaDirection: "up",
      deltaPercentageLabel: "+38.9%",
      fulfilledOrders: 8,
      unfulfilledOrders: 4,
      openIssuesCount: 2,
      ordersWithNotesCount: 1,
    });

    expect(cards[0]?.label).toBe("Selected Sales");
    expect(cards[0]?.value).toBe("Multi-currency");
    expect(cards[2]?.trend?.direction).toBe("up");
  });
});
