import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";
import { ingestCustomerEvents } from "@/server/orders/customer-events";

const schema = z.object({
  orderId: z.number().int().positive(),
  body: z.string().min(1),
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  channel: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSessionFromToken(sessionToken, getEnv().appSessionSecret);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { orderId, body: text, direction, channel } = result.data;

    await ingestCustomerEvents({
      orderId,
      entries: [
        {
          source: "dashboard",
          eventType: "customer_message",
          direction,
          channel: channel ?? "unknown",
          title: "Operator Message",
          body: text,
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add customer event", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
