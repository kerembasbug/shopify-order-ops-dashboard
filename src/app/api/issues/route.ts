import { NextResponse } from "next/server";
import { getEnv } from "@/server/env";
import { createIssue, type CreateIssueInput } from "@/server/issues/issue-service";

export async function POST(request: Request) {
  const env = getEnv();
  const apiKey = request.headers.get("x-openclaw-key");

  if (apiKey !== env.openclawApiKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateIssueInput;
  const created = await createIssue(body);

  return NextResponse.json(created, { status: 201 });
}
