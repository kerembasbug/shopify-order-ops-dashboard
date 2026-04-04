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
  salesChannel: string | null;
  landingPagePath: string | null;
  referrerUrl: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
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

function normalizeSalesChannel(sourceName: string | null) {
  const trimmedSourceName = sourceName?.trim();

  if (!trimmedSourceName) {
    return null;
  }

  if (trimmedSourceName === "web") {
    return "Online Store";
  }

  return trimmedSourceName
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeLandingPagePath(
  landingPageDisplayText: string | null,
  landingPageUrl: string | null,
) {
  const candidates = [landingPageDisplayText, landingPageUrl];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();

    if (!trimmed || !trimmed.includes("/") || /\s/.test(trimmed)) {
      continue;
    }

    try {
      const parsed = new URL(trimmed, "https://example.com");

      return parsed.pathname || null;
    } catch {
      // Best effort only.
    }
  }

  return null;
}

function normalizeReferrerHost(referrerUrl: string | null) {
  if (!referrerUrl) {
    return null;
  }

  try {
    return new URL(referrerUrl).host || null;
  } catch {
    return null;
  }
}

function getCustomAttributeValue(
  customAttributes: ShopifyOrderNode["customAttributes"],
  name: string,
) {
  const normalizedName = name.toLowerCase();

  return (
    customAttributes?.find(
      (attribute) => attribute.key?.toLowerCase() === normalizedName,
    )?.value?.trim() ?? null
  );
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

  const referrerUrl = order.referrerUrl?.trim() ?? null;
  const landingPagePath = normalizeLandingPagePath(
    order.landingPageDisplayText,
    order.landingPageUrl,
  );

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
      salesChannel: normalizeSalesChannel(order.sourceName),
      landingPagePath,
      referrerUrl,
      referrerHost: normalizeReferrerHost(referrerUrl),
      utmSource: getCustomAttributeValue(order.customAttributes, "utm_source"),
      utmMedium: getCustomAttributeValue(order.customAttributes, "utm_medium"),
      utmCampaign: getCustomAttributeValue(order.customAttributes, "utm_campaign"),
    },
    fulfillments,
  };
}
