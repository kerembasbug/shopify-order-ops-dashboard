CREATE TABLE "order_customer_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_customer_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"source" text DEFAULT 'mcp' NOT NULL,
	"event_type" text DEFAULT 'customer_message' NOT NULL,
	"direction" text DEFAULT 'inbound' NOT NULL,
	"channel" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_customer_events" ADD CONSTRAINT "order_customer_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;