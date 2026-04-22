import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderCustomerEvents, orders, stores } from "@/db/schema";
import { ensureDatabaseCompatibility } from "@/db/compatibility";

export async function getConversationsList() {
  await ensureDatabaseCompatibility();

  // Find the latest event for each order
  const latestEvents = await db
    .select({
      orderId: orderCustomerEvents.orderId,
      maxId: sql<number>`MAX(${orderCustomerEvents.id})`,
    })
    .from(orderCustomerEvents)
    .groupBy(orderCustomerEvents.orderId)
    .orderBy(desc(sql`MAX(${orderCustomerEvents.occurredAt})`))
    .limit(50);

  if (latestEvents.length === 0) {
    return [];
  }

  const maxIds = latestEvents.map((e) => e.maxId);

  // Get full details of those latest events
  const eventDetails = await db
    .select({
      event: orderCustomerEvents,
      order: {
        id: orders.id,
        shopifyOrderNumber: orders.shopifyOrderNumber,
        customerName: orders.customerName,
      },
      store: {
        name: stores.name,
      },
    })
    .from(orderCustomerEvents)
    .innerJoin(orders, eq(orders.id, orderCustomerEvents.orderId))
    .innerJoin(stores, eq(stores.id, orders.storeId))
    .where(inArray(orderCustomerEvents.id, maxIds))
    .orderBy(desc(orderCustomerEvents.occurredAt));

  return eventDetails;
}
