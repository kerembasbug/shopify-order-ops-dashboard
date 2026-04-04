import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const issueStatusEnum = pgEnum("issue_status", [
  "open",
  "investigating",
  "resolved",
]);

export const issueTypeEnum = pgEnum("issue_type", [
  "dispute",
  "delay",
  "risk",
  "address_problem",
  "tracking_problem",
  "other",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const syncTriggerTypeEnum = pgEnum("sync_trigger_type", [
  "scheduled",
  "manual",
  "initial_import",
]);

export const stores = pgTable("stores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  shopDomain: text("shop_domain").notNull().unique(),
  apiVersion: text("api_version").default("2026-01").notNull(),
  credentialsRef: text("credentials_ref"),
  status: text("status").default("active").notNull(),
  lastSuccessfulSyncAt: timestamp("last_successful_sync_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    shopifyOrderId: text("shopify_order_id").notNull(),
    shopifyOrderNumber: integer("shopify_order_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    countryCode: text("country_code"),
    currencyCode: text("currency_code"),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
    financialStatus: text("financial_status"),
    fulfillmentStatus: text("fulfillment_status"),
    trackingSummary: text("tracking_summary"),
    salesChannel: text("sales_channel"),
    landingPagePath: text("landing_page_path"),
    referrerUrl: text("referrer_url"),
    referrerHost: text("referrer_host"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    tagsJson: jsonb("tags_json").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("orders_store_id_shopify_order_id_unique").on(
      table.storeId,
      table.shopifyOrderId,
    ),
  ],
);

export const orderFulfillments = pgTable(
  "order_fulfillments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    shopifyFulfillmentId: text("shopify_fulfillment_id").notNull(),
    status: text("status"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("order_fulfillments_order_id_shopify_fulfillment_id_unique").on(
      table.orderId,
      table.shopifyFulfillmentId,
    ),
  ],
);

export const orderNotes = pgTable("order_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  authorLabel: text("author_label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderIssues = pgTable("order_issues", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  issueType: issueTypeEnum("issue_type").notNull(),
  status: issueStatusEnum("status").default("open").notNull(),
  severity: integer("severity").default(1).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadataJson: jsonb("metadata_json")
    .$type<Record<string, unknown>>()
    .default(sql`'{}'::jsonb`)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const syncRuns = pgTable("sync_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  triggerType: syncTriggerTypeEnum("trigger_type").notNull(),
  status: syncStatusEnum("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ordersScanned: integer("orders_scanned").default(0).notNull(),
  ordersChanged: integer("orders_changed").default(0).notNull(),
  errorMessage: text("error_message"),
});

export const overviewSnapshots = pgTable("overview_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storeId: integer("store_id").references(() => stores.id, {
    onDelete: "cascade",
  }),
  totalOrders: integer("total_orders").default(0).notNull(),
  totalSalesAmount: numeric("total_sales_amount", {
    precision: 12,
    scale: 2,
  }).default("0").notNull(),
  fulfilledOrders: integer("fulfilled_orders").default(0).notNull(),
  unfulfilledOrders: integer("unfulfilled_orders").default(0).notNull(),
  openIssuesCount: integer("open_issues_count").default(0).notNull(),
  ordersWithNotesCount: integer("orders_with_notes_count").default(0).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
});
