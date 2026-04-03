import { describe, expect, it } from "vitest";
import {
  getDeltaState,
  resolveComparisonRange,
} from "@/server/orders/comparison";

describe("resolveComparisonRange", () => {
  it("returns the immediately previous equal-length window for an explicit date range", () => {
    expect(
      resolveComparisonRange({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-07",
      }),
    ).toMatchObject({
      currentFrom: "2026-03-01",
      currentTo: "2026-03-07",
      previousFrom: "2026-02-22",
      previousTo: "2026-02-28",
    });
  });
});

describe("getDeltaState", () => {
  it('returns "New" when the previous amount is zero and the current amount is positive', () => {
    expect(getDeltaState("120.00", "0")).toEqual({
      direction: "up",
      percentageLabel: "New",
    });
  });

  it('returns "—" when either amount is not finite', () => {
    expect(getDeltaState("NaN", "10.00")).toEqual({
      direction: "flat",
      percentageLabel: "—",
    });
  });

  it('returns a neutral readable label for near-flat deltas', () => {
    expect(getDeltaState("100.04", "100.00")).toEqual({
      direction: "flat",
      percentageLabel: "0.0%",
    });
  });
});
