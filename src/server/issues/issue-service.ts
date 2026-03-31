import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderIssues } from "@/db/schema";

const issueSeverityMap = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

export type IssueSeverity = keyof typeof issueSeverityMap;

export type CreateIssueInput = {
  orderId: number;
  source?: string;
  issueType:
    | "dispute"
    | "delay"
    | "risk"
    | "address_problem"
    | "tracking_problem"
    | "other";
  severity: IssueSeverity;
  title: string;
  body: string;
  metadataJson?: Record<string, unknown>;
};

export function buildIssueInsert(input: CreateIssueInput) {
  return {
    orderId: input.orderId,
    source: input.source ?? "openclaw",
    issueType: input.issueType,
    status: "open" as const,
    severity: issueSeverityMap[input.severity],
    title: input.title,
    body: input.body,
    metadataJson: input.metadataJson ?? {},
  };
}

export async function createIssue(input: CreateIssueInput) {
  const [created] = await db.insert(orderIssues).values(buildIssueInsert(input)).returning();

  return created;
}

export async function listIssuesForOrder(orderId: number) {
  return db
    .select()
    .from(orderIssues)
    .where(eq(orderIssues.orderId, orderId))
    .orderBy(desc(orderIssues.createdAt));
}
