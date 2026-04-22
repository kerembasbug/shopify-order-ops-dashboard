import { beforeEach, describe, expect, it, vi } from "vitest";

const getEnvMock = vi.fn();
const ingestCustomerEventsMock = vi.fn();

vi.mock("@/server/env", () => ({
  getEnv: getEnvMock,
}));

vi.mock("@/server/orders/customer-events", () => ({
  ingestCustomerEvents: ingestCustomerEventsMock,
}));

describe("POST /api/order-context", () => {
  beforeEach(() => {
    getEnvMock.mockReset();
    ingestCustomerEventsMock.mockReset();
    getEnvMock.mockReturnValue({
      openclawApiKey: "mcp-secret",
    });
    ingestCustomerEventsMock.mockResolvedValue({
      orderId: 42,
      insertedCount: 1,
      entries: [{ id: 1 }],
    });
  });

  it("rejects a request with the wrong API key", async () => {
    const { POST } = await import("@/app/api/order-context/route");

    const response = await POST(
      new Request("http://localhost/api/order-context", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-mcp-key": "wrong-secret",
        },
        body: JSON.stringify({
          orderId: 42,
          entries: [{ title: "Customer wrote in", body: "Where is my order?" }],
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(ingestCustomerEventsMock).not.toHaveBeenCalled();
  });

  it("accepts a valid MCP ingestion payload", async () => {
    const { POST } = await import("@/app/api/order-context/route");

    const response = await POST(
      new Request("http://localhost/api/order-context", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-mcp-key": "mcp-secret",
        },
        body: JSON.stringify({
          storeKey: "booknookkit",
          shopifyOrderNumber: 4101,
          entries: [
            {
              title: "Customer asked for an ETA",
              body: "Customer wants an update before the weekend.",
              channel: "email",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(ingestCustomerEventsMock).toHaveBeenCalledTimes(1);
  });
});
