/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

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

describe("OrderDetailSheet", () => {
  it("explains that issues are written by the OpenClaw agent", async () => {
    const { OrderDetailSheet } = await import("@/components/dashboard/order-detail-sheet");

    render(
      <OrderDetailSheet
        orderId={77}
        currentQuery="orderId=77"
        order={{
          id: 77,
          storeName: "DIY Robotic Arm",
          shopifyOrderId: "gid://shopify/Order/77",
          shopifyOrderNumber: 1077,
          createdAt: "2026-04-01T12:00:00.000Z",
          updatedAt: "2026-04-01T13:00:00.000Z",
          customerName: "Ada Lovelace",
          customerEmail: "ada@example.com",
          countryCode: "US",
          currencyCode: "USD",
          totalPrice: "129.00",
          financialStatus: "PAID",
          fulfillmentStatus: "UNFULFILLED",
          trackingSummary: null,
          salesChannel: "Online Store",
          landingPagePath: "/products/robotic-arm",
          referrerHost: "instagram.com",
          utmSource: "meta",
          utmMedium: "paid-social",
          utmCampaign: "spring-launch",
          tagsJson: [],
          lastSyncedAt: "2026-04-01T13:10:00.000Z",
          storeLastSuccessfulSyncAt: "2026-04-01T13:15:00.000Z",
          fulfillments: [],
          customerEvents: [],
          notes: [],
          issues: [
            {
              id: 5,
              source: "openclaw",
              issueType: "delay",
              status: "open",
              severity: 3,
              title: "Shipment delay",
              body: "Tracking has stalled for 4 days.",
              createdAt: "2026-04-01T13:20:00.000Z",
              resolvedAt: null,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/OpenClaw agent managed/i)).toBeTruthy();
    expect(screen.getByText(/Shipment delay/i)).toBeTruthy();
  });
});
