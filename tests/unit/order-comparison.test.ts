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
      current: {
        dateFrom: "2026-03-01",
        dateTo: "2026-03-07",
      },
      previous: {
        dateFrom: "2026-02-22",
        dateTo: "2026-02-28",
      },
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
});
