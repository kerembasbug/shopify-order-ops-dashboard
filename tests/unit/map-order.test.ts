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
      sourceName: "web",
      landingPageDisplayText: "https://shop.example.com/products/book-nook-kit?utm_source=meta&utm_medium=paid-social&utm_campaign=spring-drop",
      landingPageUrl: "https://shop.example.com/products/book-nook-kit?utm_source=meta&utm_medium=paid-social&utm_campaign=spring-drop",
      referrerUrl: "https://l.facebook.com/",
      customAttributes: [
        { key: "utm_source", value: "meta" },
        { key: "utm_medium", value: "paid-social" },
        { key: "utm_campaign", value: "spring-drop" },
      ],
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
      salesChannel: "Online Store",
      landingPagePath: "/products/book-nook-kit",
      referrerUrl: "https://l.facebook.com/",
      referrerHost: "l.facebook.com",
      utmSource: "meta",
      utmMedium: "paid-social",
      utmCampaign: "spring-drop",
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

  it("returns a null referrer host for an invalid referrerUrl", () => {
    const mapped = mapShopifyOrder({
      id: "gid://shopify/Order/2",
      name: "#1002",
      createdAt: "2026-03-31T11:00:00.000Z",
      updatedAt: "2026-03-31T11:10:00.000Z",
      displayFinancialStatus: "PAID",
      displayFulfillmentStatus: "FULFILLED",
      totalPriceSet: {
        shopMoney: {
          amount: "49.99",
          currencyCode: "USD",
        },
      },
      customer: null,
      shippingAddress: null,
      tags: [],
      sourceName: "paid-social",
      landingPageDisplayText: null,
      landingPageUrl: null,
      referrerUrl: "not-a-valid-url",
      customAttributes: [],
      fulfillments: [],
    });

    expect(mapped.order.referrerHost).toBeNull();
    expect(mapped.order.salesChannel).toBe("Paid Social");
  });
});
