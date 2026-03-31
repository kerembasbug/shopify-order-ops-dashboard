import { describe, expect, it } from "vitest";
import { mapShopifyOrder } from "@/server/shopify/map-order";

describe("mapShopifyOrder", () => {
  it("maps a Shopify order into normalized order and fulfillments payloads", () => {
    const mapped = mapShopifyOrder({
      id: "gid://shopify/Order/1",
      name: "#1001",
      createdAt: "2026-03-31T10:00:00.000Z",
      updatedAt: "2026-03-31T10:30:00.000Z",
      displayFinancialStatus: "PAID",
      displayFulfillmentStatus: "UNFULFILLED",
      totalPriceSet: {
        shopMoney: {
          amount: "149.99",
          currencyCode: "USD",
        },
      },
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      shippingAddress: {
        countryCodeV2: "US",
      },
      tags: ["vip", "priority"],
      fulfillments: [
        {
          id: "gid://shopify/Fulfillment/1",
          status: "SUCCESS",
          createdAt: "2026-03-31T10:20:00.000Z",
          trackingInfo: [],
        },
      ],
    });

    expect(mapped.order).toMatchObject({
      shopifyOrderId: "gid://shopify/Order/1",
      shopifyOrderNumber: 1001,
      createdAt: "2026-03-31T10:00:00.000Z",
      updatedAt: "2026-03-31T10:30:00.000Z",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      countryCode: "US",
      currencyCode: "USD",
      totalPrice: "149.99",
      financialStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      trackingSummary: null,
      tagsJson: ["vip", "priority"],
    });

    expect(mapped.fulfillments).toEqual([
      {
        shopifyFulfillmentId: "gid://shopify/Fulfillment/1",
        status: "SUCCESS",
        carrier: null,
        trackingNumber: null,
        trackingUrl: null,
        fulfilledAt: "2026-03-31T10:20:00.000Z",
      },
    ]);
  });
});
