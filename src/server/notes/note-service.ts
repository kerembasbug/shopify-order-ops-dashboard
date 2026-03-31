import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderNotes } from "@/db/schema";

export type CreateNoteInput = {
  orderId: number;
  body: string;
  authorLabel?: string;
};

export async function createNote(input: CreateNoteInput) {
  const [created] = await db
    .insert(orderNotes)
    .values({
      orderId: input.orderId,
      body: input.body,
      authorLabel: input.authorLabel ?? "Owner",
    })
    .returning();

  return created;
}

export async function listNotesForOrder(orderId: number) {
  return db
    .select()
    .from(orderNotes)
    .where(eq(orderNotes.orderId, orderId))
    .orderBy(desc(orderNotes.createdAt));
}
