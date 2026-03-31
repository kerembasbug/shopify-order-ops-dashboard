export type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

export type ShopifyTrackingInfo = {
  number: string | null;
  url: string | null;
  company: string | null;
};

export type ShopifyFulfillmentNode = {
  id: string;
  status: string | null;
  createdAt: string;
  trackingInfo: ShopifyTrackingInfo[];
};

export type ShopifyOrderNode = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  totalPriceSet: {
    shopMoney: ShopifyMoney;
  };
  customer:
    | {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      }
    | null;
  shippingAddress:
    | {
        countryCodeV2: string | null;
      }
    | null;
  tags: string[];
  fulfillments: ShopifyFulfillmentNode[];
};

export type FetchOrdersParams = {
  storeDomain: string;
  adminToken: string;
  updatedAfter?: string;
  cursor?: string | null;
  apiVersion?: string;
};

export type FetchOrdersResult = {
  orders: ShopifyOrderNode[];
  nextCursor: string | null;
};
