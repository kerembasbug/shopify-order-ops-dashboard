import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getEnv } from "@/server/env";
import { ingestCustomerEvents } from "@/server/orders/customer-events";

export async function POST(request: Request) {
  const env = getEnv();
  const apiKey =
    request.headers.get("x-mcp-key") ?? request.headers.get("x-openclaw-key");

  if (apiKey !== env.openclawApiKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const created = await ingestCustomerEvents(body);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "invalid_payload",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("could not be resolved")) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    throw error;
  }
}
