import { beforeEach, describe, expect, it, vi } from "vitest";

const getEnvMock = vi.fn();
const createIssueMock = vi.fn();

vi.mock("@/server/env", () => ({
  getEnv: getEnvMock,
}));

vi.mock("@/server/issues/issue-service", () => ({
  createIssue: createIssueMock,
}));

describe("POST /api/issues", () => {
  beforeEach(() => {
    getEnvMock.mockReset();
    createIssueMock.mockReset();
    getEnvMock.mockReturnValue({
      openclawApiKey: "openclaw-secret",
    });
    createIssueMock.mockResolvedValue({
      id: 9001,
    });
  });

  it("rejects a request with the wrong API key", async () => {
    const { POST } = await import("@/app/api/issues/route");

    const response = await POST(
      new Request("http://localhost/api/issues", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-openclaw-key": "wrong-secret",
        },
        body: JSON.stringify({
          orderId: 42,
          issueType: "delay",
          severity: "high",
          title: "Shipment is delayed",
          body: "Tracking has stalled.",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createIssueMock).not.toHaveBeenCalled();
  });

  it("calls createIssue and returns 201 when the API key matches", async () => {
    const { POST } = await import("@/app/api/issues/route");

    const response = await POST(
      new Request("http://localhost/api/issues", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-openclaw-key": "openclaw-secret",
        },
        body: JSON.stringify({
          orderId: 42,
          issueType: "delay",
          severity: "high",
          title: "Shipment is delayed",
          body: "Tracking has stalled.",
          metadataJson: {
            trackingNumber: "1Z1234567890",
          },
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createIssueMock).toHaveBeenCalledTimes(1);
  });
});
