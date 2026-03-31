import type { ShopifyOrderNode } from "@/server/shopify/types";

export type MappedOrderRecord = {
  shopifyOrderId: string;
  shopifyOrderNumber: number;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  customerEmail: string | null;
  countryCode: string | null;
  currencyCode: string;
  totalPrice: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  trackingSummary: string | null;
  tagsJson: string[];
};

export type MappedFulfillmentRecord = {
  shopifyFulfillmentId: string;
  status: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  fulfilledAt: string;
};

export type MappedShopifyOrder = {
  order: MappedOrderRecord;
  fulfillments: MappedFulfillmentRecord[];
};

export function normalizeShopifyOrderNumber(orderName: string) {
  const firstDigits = orderName.match(/\d+/)?.[0];

  if (!firstDigits) {
    throw new Error(`Unable to normalize Shopify order number from "${orderName}"`);
  }

  return Number.parseInt(firstDigits, 10);
}

export function mapShopifyOrder(order: ShopifyOrderNode): MappedShopifyOrder {
  const customerName = [order.customer?.firstName, order.customer?.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  const fulfillments = order.fulfillments.map((fulfillment) => ({
    shopifyFulfillmentId: fulfillment.id,
    status: fulfillment.status,
    carrier: fulfillment.trackingInfo[0]?.company ?? null,
    trackingNumber: fulfillment.trackingInfo[0]?.number ?? null,
    trackingUrl: fulfillment.trackingInfo[0]?.url ?? null,
    fulfilledAt: fulfillment.createdAt,
  }));

  const trackingNumbers = order.fulfillments
    .flatMap((fulfillment) => fulfillment.trackingInfo)
    .map((trackingInfo) => trackingInfo.number?.trim() ?? "")
    .filter((trackingNumber) => trackingNumber.length > 0);

  return {
    order: {
      shopifyOrderId: order.id,
      shopifyOrderNumber: normalizeShopifyOrderNumber(order.name),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerName: customerName || null,
      customerEmail: order.customer?.email ?? null,
      countryCode: order.shippingAddress?.countryCodeV2 ?? null,
      currencyCode: order.totalPriceSet.shopMoney.currencyCode,
      totalPrice: order.totalPriceSet.shopMoney.amount,
      financialStatus: order.displayFinancialStatus,
      fulfillmentStatus: order.displayFulfillmentStatus ?? "UNFULFILLED",
      trackingSummary:
        trackingNumbers.length > 0 ? trackingNumbers.join(", ") : null,
      tagsJson: order.tags,
    },
    fulfillments,
  };
}
