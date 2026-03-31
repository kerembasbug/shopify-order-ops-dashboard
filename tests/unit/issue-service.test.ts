import { describe, expect, it } from "vitest";
import { buildIssueInsert } from "@/server/issues/issue-service";

describe("buildIssueInsert", () => {
  it("defaults status to open, preserves metadataJson, and normalizes severity to an integer", () => {
    const metadataJson = {
      trackingNumber: "1Z1234567890",
      carrier: "UPS",
    };

    const issue = buildIssueInsert({
      orderId: 42,
      source: "openclaw",
      issueType: "delay",
      severity: "high",
      title: "Shipment is delayed",
      body: "The carrier has not updated tracking.",
      metadataJson,
    });

    expect(issue).toMatchObject({
      orderId: 42,
      source: "openclaw",
      issueType: "delay",
      status: "open",
      severity: 3,
      title: "Shipment is delayed",
      body: "The carrier has not updated tracking.",
      metadataJson,
    });
  });
});
