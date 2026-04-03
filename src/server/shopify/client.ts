import type {
  FetchOrdersParams,
  FetchOrdersResult,
  ShopifyFulfillmentNode,
  ShopifyOrderNode,
} from "@/server/shopify/types";

const DEFAULT_SHOPIFY_API_VERSION = "2026-01";

const ORDERS_QUERY = `
  query Orders($cursor: String, $query: String) {
    orders(first: 50, after: $cursor, query: $query, sortKey: UPDATED_AT) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          updatedAt
          displayFinancialStatus
          displayFulfillmentStatus
          sourceName
          landingPageDisplayText
          landingPageUrl
          referrerUrl
          customAttributes {
            key
            value
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            firstName
            lastName
            email
          }
          shippingAddress {
            countryCodeV2
          }
          tags
          fulfillments {
            id
            status
            createdAt
            trackingInfo {
              number
              url
              company
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

type ShopifyOrdersGraphqlPayload = {
  data?: {
    orders?: {
      edges?: Array<{
        cursor: string;
        node: Omit<ShopifyOrderNode, "fulfillments"> & {
          fulfillments?:
            | ShopifyFulfillmentNode[]
            | {
                nodes?: ShopifyFulfillmentNode[];
              };
        };
      }>;
      pageInfo?: {
        hasNextPage?: boolean;
      };
    };
  };
  errors?: Array<{
    message?: string;
  }>;
};

export async function fetchOrders({
  storeDomain,
  adminToken,
  updatedAfter,
  cursor = null,
  apiVersion = DEFAULT_SHOPIFY_API_VERSION,
}: FetchOrdersParams): Promise<FetchOrdersResult> {
  const response = await fetch(
    `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shopify-access-token": adminToken,
      },
      body: JSON.stringify({
        query: ORDERS_QUERY,
        variables: {
          cursor,
          query: updatedAfter ? `updated_at:>=${updatedAfter}` : undefined,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Shopify orders fetch failed with ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as ShopifyOrdersGraphqlPayload;

  if (payload.errors?.length) {
    throw new Error(
      payload.errors
        .map((error) => error.message)
        .filter((message): message is string => Boolean(message))
        .join("; "),
    );
  }

  const ordersConnection = payload.data?.orders;

  if (!ordersConnection) {
    throw new Error("Shopify orders payload missing orders data");
  }

  const edges = ordersConnection.edges ?? [];
  const hasNextPage = ordersConnection.pageInfo?.hasNextPage ?? false;

  return {
    orders: edges.map((edge) => ({
      ...edge.node,
      fulfillments: Array.isArray(edge.node.fulfillments)
        ? edge.node.fulfillments
        : edge.node.fulfillments?.nodes ?? [],
    })),
    nextCursor: hasNextPage ? edges.at(-1)?.cursor ?? null : null,
  };
}
