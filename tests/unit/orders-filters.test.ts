import { describe, expect, it } from "vitest";
import { parseOrderFilters } from "@/server/orders/filters";

describe("parseOrderFilters", () => {
  it("normalizes store, fulfillment, issue, note, search, and date filters", () => {
    const filters = parseOrderFilters(
      new URLSearchParams({
        store: " 42 ",
        fulfillment: "fulfilled",
        issues: "true",
        notes: "true",
        search: "  ada lovelace  ",
        from: "2026-03-01",
        to: "2026-03-31",
      }),
    );

    expect(filters).toMatchObject({
      storeId: 42,
      fulfillment: "fulfilled",
      hasIssues: true,
      hasNotes: true,
      search: "ada lovelace",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });
  });

  it("parses a source query alongside date filters", () => {
    const filters = parseOrderFilters(
      new URLSearchParams({
        source: "  meta / paid social  ",
        from: "2026-03-01",
        to: "2026-03-07",
      }),
    );

    expect(filters).toMatchObject({
      sourceSearch: "meta / paid social",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-07",
    });
  });

  it("falls back to all when fulfillment is invalid", () => {
    const filters = parseOrderFilters(
      new URLSearchParams({
        fulfillment: "not-a-real-fulfillment-state",
      }),
    );

    expect(filters).toMatchObject({
      fulfillment: "all",
    });
  });

  it("drops invalid date inputs instead of forwarding them to query builders", () => {
    const filters = parseOrderFilters(
      new URLSearchParams({
        from: "not-a-date",
        to: "2026-99-99",
      }),
    );

    expect(filters).toMatchObject({
      dateFrom: null,
      dateTo: null,
    });
  });

  it("normalizes reversed explicit date ranges into ascending order", () => {
    const filters = parseOrderFilters(
      new URLSearchParams({
        from: "2026-03-31",
        to: "2026-03-01",
      }),
    );

    expect(filters).toMatchObject({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });
  });
});
