/** @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/dashboard/filter-bar";
import type { OrderFilters } from "@/server/orders/filters";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
let currentPathname = "/dashboard";
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

function buildFilters(overrides: Partial<OrderFilters> = {}): OrderFilters {
  return {
    storeId: null,
    fulfillment: "all",
    hasIssues: false,
    hasNotes: false,
    hasChargeback: false,
    search: "",
    sourceSearch: "",
    dateFrom: null,
    dateTo: null,
    ...overrides,
  };
}

describe("FilterBar", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    currentPathname = "/dashboard";
    currentSearchParams = new URLSearchParams();
  });

  it("threads the source search into the URL when applying filters", async () => {
    currentSearchParams = new URLSearchParams("orderId=42");

    render(<FilterBar stores={[]} filters={buildFilters()} />);

    await userEvent.click(screen.getByRole("button", { name: "More filters" }));
    await userEvent.type(screen.getByLabelText("Search order sources"), "Meta");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/dashboard?source=Meta"),
    );
  });

  it("threads the chargeback toggle into the URL", async () => {
    render(<FilterBar stores={[]} filters={buildFilters()} />);

    await userEvent.click(screen.getByRole("button", { name: "More filters" }));
    await userEvent.click(screen.getByLabelText("Chargeback tag"));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/dashboard?chargeback=true"),
    );
  });

  it("clears the source search and resets the URL", async () => {
    currentSearchParams = new URLSearchParams("source=Google&orderId=42");

    render(
      <FilterBar
        stores={[]}
        filters={buildFilters({
          sourceSearch: "Google",
        })}
      />,
    );

    const sourceField = screen.getByLabelText(
      "Search order sources",
    ) as HTMLInputElement;
    expect(sourceField.value).toBe("Google");

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(sourceField.value).toBe("");
  });
});
