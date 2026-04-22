import { pool } from "@/db";

let compatibilityPromise: Promise<void> | null = null;

const compatibilityStatements = [
  `alter table "orders" add column if not exists "sales_channel" text`,
  `alter table "orders" add column if not exists "landing_page_path" text`,
  `alter table "orders" add column if not exists "referrer_url" text`,
  `alter table "orders" add column if not exists "referrer_host" text`,
  `alter table "orders" add column if not exists "utm_source" text`,
  `alter table "orders" add column if not exists "utm_medium" text`,
  `alter table "orders" add column if not exists "utm_campaign" text`,
  `create table if not exists "order_customer_events" (
    "id" integer primary key generated always as identity,
    "order_id" integer not null references "orders"("id") on delete cascade,
    "source" text default 'mcp' not null,
    "event_type" text default 'customer_message' not null,
    "direction" text default 'inbound' not null,
    "channel" text,
    "title" text not null,
    "body" text not null,
    "metadata_json" jsonb default '{}'::jsonb not null,
    "occurred_at" timestamp with time zone default now() not null,
    "created_at" timestamp with time zone default now() not null
  )`,
  `create index if not exists "order_customer_events_order_id_occurred_at_idx"
    on "order_customer_events" ("order_id", "occurred_at" desc)`,
];

export async function ensureDatabaseCompatibility() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  compatibilityPromise ??= (async () => {
    for (const statement of compatibilityStatements) {
      await pool.query(statement);
    }
  })().catch((error) => {
    compatibilityPromise = null;
    throw error;
  });

  await compatibilityPromise;
}
