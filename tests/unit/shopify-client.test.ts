import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOrders } from "@/server/shopify/client";

describe("fetchOrders", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("queries fulfillments without the legacy nodes wrapper", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            orders: {
              edges: [
                {
                  cursor: "cursor-1",
                  node: {
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
                    customer: null,
                    shippingAddress: null,
                    tags: [],
                    fulfillments: [
                      {
                        id: "gid://shopify/Fulfillment/1",
                        status: "SUCCESS",
                        createdAt: "2026-03-31T10:20:00.000Z",
                        trackingInfo: [],
                      },
                    ],
                  },
                },
              ],
              pageInfo: {
                hasNextPage: false,
              },
            },
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const result = await fetchOrders({
      storeDomain: "example.myshopify.com",
      adminToken: "shpat_test",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(requestInit?.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };

    expect(payload.query).toContain("fulfillments {");
    expect(payload.query).not.toContain("nodes {");
    expect(result.orders[0]?.fulfillments).toHaveLength(1);
  });
});
