import { NextResponse } from "next/server";
import { isDashboardAuthError, requireDashboardSession } from "@/server/http";
import { createNote } from "@/server/notes/note-service";

type OrderRouteContext = {
  params: {
    id: string;
  };
};

function parseOrderId(rawId: string) {
  const orderId = Number.parseInt(rawId, 10);
  return Number.isFinite(orderId) ? orderId : null;
}

export async function POST(request: Request, context: OrderRouteContext) {
  try {
    await requireDashboardSession();
    const orderId = parseOrderId(context.params.id);

    if (!orderId) {
      return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });
    }

    const body = (await request.json()) as {
      body?: string;
      authorLabel?: string;
    };

    if (!body.body?.trim()) {
      return NextResponse.json({ error: "note_body_required" }, { status: 400 });
    }

    const note = await createNote({
      orderId,
      body: body.body.trim(),
      authorLabel: body.authorLabel?.trim() || undefined,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (isDashboardAuthError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
