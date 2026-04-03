/** @vitest-environment jsdom */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("OrdersTable", () => {
  it("renders attribution columns with populated values", async () => {
    const { OrdersTable } = await import("@/components/dashboard/orders-table");

    render(
      <OrdersTable
        rows={
          [
            {
              id: 101,
              storeName: "Book Nook Kit",
              shopifyOrderNumber: 4101,
              createdAt: "2026-04-01T09:30:00.000Z",
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
            },
          ] as unknown as Parameters<typeof OrdersTable>[0]["rows"]
        }
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

  it("renders an em dash when attribution data is missing", async () => {
    const { OrdersTable } = await import("@/components/dashboard/orders-table");

    render(
      <OrdersTable
        rows={
          [
            {
              id: 102,
              storeName: "Book Nook Kit",
              shopifyOrderNumber: 4102,
              createdAt: "2026-04-01T11:30:00.000Z",
              customerName: null,
              customerEmail: null,
              countryCode: null,
              currencyCode: "USD",
              totalPrice: "89.00",
              financialStatus: "PENDING",
              fulfillmentStatus: null,
              trackingSummary: null,
              hasOpenIssue: false,
              hasNotes: false,
              lastSyncedAt: "2026-04-01T12:00:00.000Z",
              salesChannel: null,
              landingPagePath: null,
              referrerHost: null,
              utmSource: null,
              utmMedium: null,
              utmCampaign: null,
            },
          ] as unknown as Parameters<typeof OrdersTable>[0]["rows"]
        }
        currentQuery=""
        selectedOrderId={null}
      />,
    );

    const row = screen.getByText("#4102").closest("tr");
    expect(row).toBeTruthy();

    const rowWithin = within(row as HTMLTableRowElement);
    expect(rowWithin.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});
