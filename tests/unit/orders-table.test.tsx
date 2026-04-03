/** @vitest-environment jsdom */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrdersTable, type OrdersTableRow } from "@/components/dashboard/orders-table";

vi.mock("next/link", () => ({
  default: ({
    children,
    className,
    href,
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

function buildRow(overrides: Partial<OrdersTableRow> = {}): OrdersTableRow {
  return {
    id: 101,
    storeName: "Book Nook Kit",
    shopifyOrderNumber: 4101,
    createdAt: "2026-04-01T09:30:00.000Z",
    updatedAt: "2026-04-01T09:45:00.000Z",
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    countryCode: "US",
    currencyCode: "USD",
    totalPrice: "149.00",
    financialStatus: "PAID",
    fulfillmentStatus: "UNFULFILLED",
    trackingSummary: "Label created",
    hasOpenIssue: false,
    hasNotes: true,
    lastSyncedAt: "2026-04-01T10:00:00.000Z",
    salesChannel: "Online Store",
    landingPagePath: "/products/book-nook-kit",
    referrerHost: "l.facebook.com",
    utmSource: "meta",
    utmMedium: "paid-social",
    utmCampaign: "spring-drop",
    ...overrides,
  };
}

describe("OrdersTable", () => {
  it("renders attribution columns with populated values", () => {
    render(
      <OrdersTable
        rows={[buildRow()]}
        currentQuery=""
        selectedOrderId={null}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Sales Channel" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Landing Page" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Referrer / Source" }),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "UTM" })).toBeTruthy();

    const row = screen.getByText("Online Store").closest("tr");
    expect(row).toBeTruthy();

    const rowWithin = within(row as HTMLTableRowElement);
    expect(rowWithin.getByText("Online Store")).toBeTruthy();
    expect(rowWithin.getByText("/products/book-nook-kit")).toBeTruthy();
    expect(rowWithin.getByText("l.facebook.com")).toBeTruthy();
    expect(
      rowWithin.getByText("meta / paid-social / spring-drop"),
    ).toBeTruthy();
  });

  it("renders an em dash when attribution data is missing", () => {
    render(
      <OrdersTable
        rows={[
          buildRow({
            id: 102,
            shopifyOrderNumber: 4102,
            createdAt: "2026-04-01T11:30:00.000Z",
            updatedAt: "2026-04-01T11:45:00.000Z",
            customerName: "Grace Hopper",
            customerEmail: "grace@example.com",
            totalPrice: "89.00",
            financialStatus: "PENDING",
            fulfillmentStatus: "FULFILLED",
            trackingSummary: "Delivered",
            lastSyncedAt: "2026-04-01T12:00:00.000Z",
            salesChannel: null,
            landingPagePath: null,
            referrerHost: null,
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
          }),
        ]}
        currentQuery=""
        selectedOrderId={null}
      />,
    );

    const row = screen.getByText("#4102").closest("tr");
    expect(row).toBeTruthy();

    const rowWithin = within(row as HTMLTableRowElement);
    const attributionCells = Array.from(
      (row as HTMLTableRowElement).querySelectorAll(".orders-table__truncate"),
      (cell) => cell.textContent?.trim(),
    );

    expect(rowWithin.getByText("Grace Hopper")).toBeTruthy();
    expect(attributionCells).toEqual(["—", "—", "—", "—"]);
  });
});
