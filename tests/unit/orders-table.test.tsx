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
    hasChargeback: false,
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
  it("renders a condensed source summary with attribution context", () => {
    render(
      <OrdersTable
        rows={[buildRow()]}
        currentQuery=""
        selectedOrderId={null}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Source" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Flags" })).toBeTruthy();

    const row = screen.getByText("#4101").closest("tr");
    expect(row).toBeTruthy();

    const rowWithin = within(row as HTMLTableRowElement);
    expect(
      rowWithin.getByText("Online Store • /products/book-nook-kit"),
    ).toBeTruthy();
    expect(
      rowWithin.getByText("l.facebook.com • meta / paid-social / spring-drop"),
    ).toBeTruthy();
    expect(rowWithin.getByText("Note")).toBeTruthy();
  });

  it("shows chargeback and fallback source copy when attribution data is missing", () => {
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
            hasChargeback: true,
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
    expect(rowWithin.getByText("Grace Hopper")).toBeTruthy();
    expect(rowWithin.getByText("Direct / unattributed")).toBeTruthy();
    expect(rowWithin.getByText("No referrer or UTM context")).toBeTruthy();
    expect(rowWithin.getByText("Chargeback")).toBeTruthy();
  });
});
