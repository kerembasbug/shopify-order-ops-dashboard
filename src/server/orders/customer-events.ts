import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDatabaseCompatibility } from "@/db/compatibility";
import { db } from "@/db";
import { orderCustomerEvents, orders, stores } from "@/db/schema";

const customerEventEntrySchema = z.object({
  source: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  direction: z.string().min(1).optional(),
  channel: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

const ingestCustomerEventsSchema = z
  .object({
    orderId: z.number().int().positive().optional(),
    storeId: z.number().int().positive().optional(),
    storeKey: z.string().min(1).optional(),
    shopifyOrderNumber: z.number().int().positive().optional(),
    entries: z.array(customerEventEntrySchema).min(1),
  })
  .refine(
    (value) =>
      typeof value.orderId === "number" ||
      (typeof value.shopifyOrderNumber === "number" &&
        (typeof value.storeId === "number" || typeof value.storeKey === "string")),
    {
      message: "Provide orderId or a store + Shopify order number pair.",
      path: ["orderId"],
    },
  );

export type CustomerEventEntryInput = z.infer<typeof customerEventEntrySchema>;
export type IngestCustomerEventsInput = z.infer<typeof ingestCustomerEventsSchema>;

async function resolveOrderId(input: IngestCustomerEventsInput) {
  if (typeof input.orderId === "number") {
    return input.orderId;
  }

  const [orderRow] = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId))
    .where(
      and(
        eq(orders.shopifyOrderNumber, input.shopifyOrderNumber as number),
        typeof input.storeId === "number" ? eq(stores.id, input.storeId) : undefined,
        typeof input.storeKey === "string" ? eq(stores.key, input.storeKey) : undefined,
      ),
    )
    .limit(1);

  return orderRow?.id ?? null;
}

export async function listCustomerEventsForOrder(orderId: number) {
  await ensureDatabaseCompatibility();

  return db
    .select()
    .from(orderCustomerEvents)
    .where(eq(orderCustomerEvents.orderId, orderId))
    .orderBy(desc(orderCustomerEvents.occurredAt), desc(orderCustomerEvents.createdAt));
}

export async function ingestCustomerEvents(rawInput: IngestCustomerEventsInput) {
  await ensureDatabaseCompatibility();

  const input = ingestCustomerEventsSchema.parse(rawInput);
  const resolvedOrderId = await resolveOrderId(input);

  if (!resolvedOrderId) {
    throw new Error("Order could not be resolved for customer event ingestion.");
  }

  const created = await db
    .insert(orderCustomerEvents)
    .values(
      input.entries.map((entry) => ({
        orderId: resolvedOrderId,
        source: entry.source ?? "mcp",
        eventType: entry.eventType ?? "customer_message",
        direction: entry.direction ?? "inbound",
        channel: entry.channel ?? null,
        title: entry.title,
        body: entry.body,
        metadataJson: entry.metadataJson ?? {},
        occurredAt: entry.occurredAt ? new Date(entry.occurredAt) : new Date(),
      })),
    )
    .returning();

  return {
    orderId: resolvedOrderId,
    insertedCount: created.length,
    entries: created,
  };
}
