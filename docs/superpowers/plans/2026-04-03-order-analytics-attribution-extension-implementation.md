# Order Analytics And Attribution Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add date-driven sales comparison KPIs and best-effort attribution data to the existing dashboard without turning it into a separate BI product.

**Architecture:** Extend the normalized `orders` record with nullable attribution columns, keep comparison math in a dedicated server helper so the page stays thin, and widen the dashboard UI by reusing the current filter bar and table shell. Multi-currency periods remain currency-safe by showing comparison state and labels instead of inventing a blended money total.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Drizzle ORM, PostgreSQL, Shopify Admin GraphQL, Vitest, Playwright

---

## File Structure

- Modify: `src/db/schema.ts`
- Modify: `src/server/shopify/types.ts`
- Modify: `src/server/shopify/client.ts`
- Modify: `src/server/shopify/map-order.ts`
- Modify: `src/server/orders/filters.ts`
- Modify: `src/server/orders/order-service.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/filter-bar.tsx`
- Modify: `src/components/dashboard/orders-table.tsx`
- Modify: `src/components/dashboard/overview-strip.tsx`
- Modify: `src/components/dashboard/dashboard-utils.ts`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/map-order.test.ts`
- Modify: `tests/unit/orders-filters.test.ts`
- Modify: `tests/unit/root-page.test.ts`
- Modify: `tests/unit/shopify-client.test.ts`
- Modify: `tests/e2e/dashboard.spec.ts`
- Create: `src/server/orders/comparison.ts`
- Create: `tests/unit/order-comparison.test.ts`
- Create: `tests/unit/orders-table.test.tsx`
- Create: `drizzle/0001_order_analytics_attribution.sql`
- Create: `drizzle/meta/0001_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

## Task 1: Capture Attribution Fields During Shopify Sync

**Files:**
- Modify: `tests/unit/shopify-client.test.ts`
- Modify: `tests/unit/map-order.test.ts`
- Modify: `src/server/shopify/types.ts`
- Modify: `src/server/shopify/client.ts`
- Modify: `src/server/shopify/map-order.ts`

- [ ] **Step 1: Write the failing GraphQL client test for attribution fields**

```ts
it("requests attribution-friendly order fields", async () => {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          orders: {
            edges: [
              {
                cursor: "cursor-1",
                node: {
                  id: "gid://shopify/Order/1",
                  name: "#1001",
                  createdAt: "2026-03-31T10:00:00.000Z",
                  updatedAt: "2026-03-31T10:30:00.000Z",
                  displayFinancialStatus: "PAID",
                  displayFulfillmentStatus: "UNFULFILLED",
                  sourceName: "web",
                  landingPageDisplayText: "/products/book-nook-kit",
                  landingPageUrl: "https://booknookkit.com/products/book-nook-kit?utm_source=meta",
                  referrerUrl: "https://l.facebook.com/",
                  totalPriceSet: {
                    shopMoney: {
                      amount: "149.99",
                      currencyCode: "USD",
                    },
                  },
                  customer: null,
                  shippingAddress: null,
                  tags: [],
                  customAttributes: [
                    { key: "utm_source", value: "meta" },
                    { key: "utm_medium", value: "paid-social" },
                    { key: "utm_campaign", value: "spring-drop" },
                  ],
                  fulfillments: [],
                },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );

  const result = await fetchOrders({
    storeDomain: "example.myshopify.com",
    adminToken: "shpat_test",
  });

  const [, requestInit] = fetchMock.mock.calls[0] ?? [];
  const payload = JSON.parse(String(requestInit?.body)) as { query: string };

  expect(payload.query).toContain("sourceName");
  expect(payload.query).toContain("landingPageDisplayText");
  expect(payload.query).toContain("landingPageUrl");
  expect(payload.query).toContain("referrerUrl");
  expect(payload.query).toContain("customAttributes");
  expect(payload.query).toContain("key");
  expect(payload.query).toContain("value");
  expect(result.orders[0]?.sourceName).toBe("web");
});
```

- [ ] **Step 2: Write the failing mapper test for normalized attribution output**

```ts
it("maps best-effort attribution fields into the normalized order payload", () => {
  const mapped = mapShopifyOrder({
    id: "gid://shopify/Order/1",
    name: "#1001",
    createdAt: "2026-03-31T10:00:00.000Z",
    updatedAt: "2026-03-31T10:30:00.000Z",
    displayFinancialStatus: "PAID",
    displayFulfillmentStatus: "UNFULFILLED",
    sourceName: "web",
    landingPageDisplayText: "/products/book-nook-kit",
    landingPageUrl: "https://booknookkit.com/products/book-nook-kit?utm_source=meta",
    referrerUrl: "https://l.facebook.com/",
    customAttributes: [
      { key: "utm_source", value: "meta" },
      { key: "utm_medium", value: "paid-social" },
      { key: "utm_campaign", value: "spring-drop" },
    ],
    totalPriceSet: {
      shopMoney: {
        amount: "149.99",
        currencyCode: "USD",
      },
    },
    customer: null,
    shippingAddress: null,
    tags: [],
    fulfillments: [],
  });

  expect(mapped.order).toMatchObject({
    salesChannel: "Online Store",
    landingPagePath: "/products/book-nook-kit",
    referrerUrl: "https://l.facebook.com/",
    referrerHost: "l.facebook.com",
    utmSource: "meta",
    utmMedium: "paid-social",
    utmCampaign: "spring-drop",
  });
});
```

- [ ] **Step 3: Run the targeted tests to confirm failure**

Run:

```bash
pnpm test -- --run tests/unit/shopify-client.test.ts tests/unit/map-order.test.ts
```

Expected: FAIL because `ShopifyOrderNode` and `MappedOrderRecord` do not expose attribution fields yet.

- [ ] **Step 4: Extend Shopify types and query payload shape**

```ts
export type ShopifyOrderAttribute = {
  key: string | null;
  value: string | null;
};

export type ShopifyOrderNode = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  sourceName: string | null;
  landingPageDisplayText: string | null;
  landingPageUrl: string | null;
  referrerUrl: string | null;
  customAttributes: ShopifyOrderAttribute[];
  totalPriceSet: {
    shopMoney: ShopifyMoney;
  };
  customer:
    | {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      }
    | null;
  shippingAddress:
    | {
        countryCodeV2: string | null;
      }
    | null;
  tags: string[];
  fulfillments: ShopifyFulfillmentNode[];
};
```

```ts
const ORDERS_QUERY = `
  query Orders($cursor: String, $query: String) {
    orders(first: 50, after: $cursor, query: $query, sortKey: UPDATED_AT) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          updatedAt
          displayFinancialStatus
          displayFulfillmentStatus
          sourceName
          landingPageDisplayText
          landingPageUrl
          referrerUrl
          customAttributes {
            key
            value
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            firstName
            lastName
            email
          }
          shippingAddress {
            countryCodeV2
          }
          tags
          fulfillments {
            id
            status
            createdAt
            trackingInfo {
              number
              url
              company
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
```

- [ ] **Step 5: Normalize attribution fields in the mapper**

```ts
function normalizeSalesChannel(sourceName: string | null) {
  const normalized = sourceName?.trim().toLowerCase();

  if (!normalized || normalized === "unknown") {
    return null;
  }

  if (normalized === "web") {
    return "Online Store";
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAttributeValue(attributes: ShopifyOrderNode["customAttributes"], key: string) {
  return (
    attributes.find((attribute) => attribute.key?.trim().toLowerCase() === key)?.value?.trim() ??
    null
  );
}

function getReferrerHost(referrerUrl: string | null) {
  if (!referrerUrl) {
    return null;
  }

  try {
    return new URL(referrerUrl).host || null;
  } catch {
    return null;
  }
}
```

```ts
export type MappedOrderRecord = {
  shopifyOrderId: string;
  shopifyOrderNumber: number;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  customerEmail: string | null;
  countryCode: string | null;
  currencyCode: string;
  totalPrice: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  trackingSummary: string | null;
  tagsJson: string[];
  salesChannel: string | null;
  landingPagePath: string | null;
  referrerUrl: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};
```

- [ ] **Step 6: Re-run the targeted tests**

Run:

```bash
pnpm test -- --run tests/unit/shopify-client.test.ts tests/unit/map-order.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit the mapper slice**

```bash
git add tests/unit/shopify-client.test.ts tests/unit/map-order.test.ts src/server/shopify/types.ts src/server/shopify/client.ts src/server/shopify/map-order.ts
git commit -m "feat: map shopify attribution fields"
```

## Task 2: Persist Attribution Fields And Add Comparison Helpers

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/server/orders/comparison.ts`
- Modify: `src/server/orders/filters.ts`
- Modify: `src/server/orders/order-service.ts`
- Modify: `tests/unit/orders-filters.test.ts`
- Create: `tests/unit/order-comparison.test.ts`
- Create: `drizzle/0001_order_analytics_attribution.sql`
- Create: `drizzle/meta/0001_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

- [ ] **Step 1: Write the failing filter and comparison tests**

```ts
it("parses source search alongside the existing order filters", () => {
  const filters = parseOrderFilters(
    new URLSearchParams({
      source: " meta ",
      from: "2026-03-01",
      to: "2026-03-07",
    }),
  );

  expect(filters).toMatchObject({
    sourceSearch: "meta",
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
});
```

```ts
it("builds the previous window using the same day count", () => {
  const range = resolveComparisonRange({
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });

  expect(range).toMatchObject({
    currentFrom: "2026-03-01",
    currentTo: "2026-03-07",
    previousFrom: "2026-02-22",
    previousTo: "2026-02-28",
  });
});

it("returns a readable delta state when the previous period is zero", () => {
  expect(getDeltaState("120.00", "0")).toEqual({
    direction: "up",
    percentageLabel: "New",
  });
});
```

- [ ] **Step 2: Run the targeted tests to verify failure**

Run:

```bash
pnpm test -- --run tests/unit/orders-filters.test.ts tests/unit/order-comparison.test.ts
```

Expected: FAIL because `sourceSearch`, `resolveComparisonRange`, and `getDeltaState` do not exist yet.

- [ ] **Step 3: Extend the schema and order upsert path with nullable attribution columns**

```ts
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
    tagsJson: jsonb("tags_json").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    salesChannel: text("sales_channel"),
    landingPagePath: text("landing_page_path"),
    referrerUrl: text("referrer_url"),
    referrerHost: text("referrer_host"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("orders_store_id_shopify_order_id_unique").on(
      table.storeId,
      table.shopifyOrderId,
    ),
  ],
);
```

```ts
await transaction
  .insert(orders)
  .values({
    storeId: Number(storeId),
    shopifyOrderId: mapped.order.shopifyOrderId,
    shopifyOrderNumber: mapped.order.shopifyOrderNumber,
    createdAt: new Date(mapped.order.createdAt),
    updatedAt: new Date(mapped.order.updatedAt),
    customerName: mapped.order.customerName,
    customerEmail: mapped.order.customerEmail,
    countryCode: mapped.order.countryCode,
    currencyCode: mapped.order.currencyCode,
    totalPrice: mapped.order.totalPrice,
    financialStatus: mapped.order.financialStatus,
    fulfillmentStatus: mapped.order.fulfillmentStatus,
    trackingSummary: mapped.order.trackingSummary,
    tagsJson: mapped.order.tagsJson,
    salesChannel: mapped.order.salesChannel,
    landingPagePath: mapped.order.landingPagePath,
    referrerUrl: mapped.order.referrerUrl,
    referrerHost: mapped.order.referrerHost,
    utmSource: mapped.order.utmSource,
    utmMedium: mapped.order.utmMedium,
    utmCampaign: mapped.order.utmCampaign,
  })
  .onConflictDoUpdate({
    target: [orders.storeId, orders.shopifyOrderId],
    set: {
      shopifyOrderNumber: mapped.order.shopifyOrderNumber,
      createdAt: new Date(mapped.order.createdAt),
      updatedAt: new Date(mapped.order.updatedAt),
      customerName: mapped.order.customerName,
      customerEmail: mapped.order.customerEmail,
      countryCode: mapped.order.countryCode,
      currencyCode: mapped.order.currencyCode,
      totalPrice: mapped.order.totalPrice,
      financialStatus: mapped.order.financialStatus,
      fulfillmentStatus: mapped.order.fulfillmentStatus,
      trackingSummary: mapped.order.trackingSummary,
      tagsJson: mapped.order.tagsJson,
      salesChannel: mapped.order.salesChannel,
      landingPagePath: mapped.order.landingPagePath,
      referrerUrl: mapped.order.referrerUrl,
      referrerHost: mapped.order.referrerHost,
      utmSource: mapped.order.utmSource,
      utmMedium: mapped.order.utmMedium,
      utmCampaign: mapped.order.utmCampaign,
    },
  });
```

- [ ] **Step 4: Add a dedicated comparison helper and parse the new source filter**

```ts
export type ComparisonDirection = "up" | "down" | "flat";

export function resolveComparisonRange(filters: {
  dateFrom: string | null;
  dateTo: string | null;
}) {
  const defaultCurrentTo = new Date();
  const currentTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : defaultCurrentTo;
  const currentFrom = filters.dateFrom
    ? new Date(`${filters.dateFrom}T00:00:00.000Z`)
    : new Date(currentTo.getTime() - 29 * 24 * 60 * 60 * 1000);
  const dayCount = Math.max(1, Math.round((currentTo.getTime() - currentFrom.getTime()) / 86400000) + 1);
  const previousTo = new Date(currentFrom.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - (dayCount - 1) * 86400000);

  return {
    currentFrom: currentFrom.toISOString().slice(0, 10),
    currentTo: currentTo.toISOString().slice(0, 10),
    previousFrom: previousFrom.toISOString().slice(0, 10),
    previousTo: previousTo.toISOString().slice(0, 10),
  };
}

export function getDeltaState(currentAmount: string, previousAmount: string) {
  const current = Number.parseFloat(currentAmount);
  const previous = Number.parseFloat(previousAmount);

  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { direction: "flat" as const, percentageLabel: "—" };
  }

  if (previous === 0) {
    return current > 0
      ? { direction: "up" as const, percentageLabel: "New" }
      : { direction: "flat" as const, percentageLabel: "0%" };
  }

  const percentage = ((current - previous) / previous) * 100;
  const rounded = `${Math.abs(percentage).toFixed(1)}%`;

  if (Math.abs(percentage) < 0.1) {
    return { direction: "flat" as const, percentageLabel: "0.0%" };
  }

  return {
    direction: percentage > 0 ? ("up" as const) : ("down" as const),
    percentageLabel: rounded,
  };
}
```

```ts
export type OrderFilters = {
  storeId: number | null;
  fulfillment: "all" | "fulfilled" | "unfulfilled";
  hasIssues: boolean;
  hasNotes: boolean;
  search: string;
  sourceSearch: string;
  dateFrom: string | null;
  dateTo: string | null;
};
```

- [ ] **Step 5: Teach the query layer to filter and summarize attribution-aware orders**

```ts
function buildSourceSearchCondition(sourceSearch: string) {
  if (!sourceSearch) {
    return undefined;
  }

  const pattern = `%${sourceSearch}%`;

  return sql<boolean>`(
    coalesce(${orders.salesChannel}, '') ilike ${pattern}
    or coalesce(${orders.referrerHost}, '') ilike ${pattern}
    or coalesce(${orders.utmSource}, '') ilike ${pattern}
    or coalesce(${orders.utmMedium}, '') ilike ${pattern}
    or coalesce(${orders.utmCampaign}, '') ilike ${pattern}
  )`;
}
```

```ts
const query = db
  .select({
    totalOrders: sql<number>`count(*)::int`,
    totalSalesAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)::text`,
    currencyCodes: sql<string[]>`coalesce(array_agg(distinct ${orders.currencyCode}) filter (where ${orders.currencyCode} is not null), '{}')`,
    fulfilledOrders: sql<number>`count(*) filter (where ${orders.fulfillmentStatus} = 'FULFILLED')::int`,
    unfulfilledOrders: sql<number>`count(*) filter (where coalesce(${orders.fulfillmentStatus}, '') <> 'FULFILLED')::int`,
    openIssuesCount: sql<number>`count(distinct case when ${hasOpenIssue} then ${orders.id} else null end)::int`,
    ordersWithNotesCount: sql<number>`count(distinct case when ${hasNotes} then ${orders.id} else null end)::int`,
  })
  .from(orders)
  .innerJoin(stores, eq(stores.id, orders.storeId));
```

```ts
const [currentSummary, previousSummary] = await Promise.all([
  getOverviewSummary(filters),
  getOverviewSummary({
    ...filters,
    dateFrom: comparisonRange.previousFrom,
    dateTo: comparisonRange.previousTo,
  }),
]);

const delta = getDeltaState(
  currentSummary.totalSalesAmount,
  previousSummary.totalSalesAmount,
);

return {
  filters: {
    ...filters,
    dateFrom: comparisonRange.currentFrom,
    dateTo: comparisonRange.currentTo,
  },
  comparisonRange,
  totalOrders: currentSummary.totalOrders,
  totalSalesAmount: currentSummary.totalSalesAmount,
  previousSalesAmount: previousSummary.totalSalesAmount,
  currencyCodes: currentSummary.currencyCodes,
  deltaDirection: delta.direction,
  deltaPercentageLabel: delta.percentageLabel,
  fulfilledOrders: currentSummary.fulfilledOrders,
  unfulfilledOrders: currentSummary.unfulfilledOrders,
  openIssuesCount: currentSummary.openIssuesCount,
  ordersWithNotesCount: currentSummary.ordersWithNotesCount,
};
```

- [ ] **Step 6: Generate the migration**

Run:

```bash
pnpm db:generate
```

Expected: `drizzle/0001_order_analytics_attribution.sql`, `drizzle/meta/0001_snapshot.json`, and `drizzle/meta/_journal.json` are updated with the new order columns.

- [ ] **Step 7: Re-run the targeted tests**

Run:

```bash
pnpm test -- --run tests/unit/orders-filters.test.ts tests/unit/order-comparison.test.ts tests/unit/map-order.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit the data-layer slice**

```bash
git add src/db/schema.ts src/server/orders/comparison.ts src/server/orders/filters.ts src/server/orders/order-service.ts tests/unit/orders-filters.test.ts tests/unit/order-comparison.test.ts drizzle/0001_order_analytics_attribution.sql drizzle/meta/0001_snapshot.json drizzle/meta/_journal.json
git commit -m "feat: add order analytics comparison data layer"
```

## Task 3: Build The Comparison-Aware KPI Strip

**Files:**
- Modify: `tests/unit/root-page.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/overview-strip.tsx`
- Modify: `src/components/dashboard/dashboard-utils.ts`
- Modify: `src/server/orders/order-service.ts`

- [ ] **Step 1: Write the failing server/page test for comparison-aware overview data**

```ts
it("builds comparison-aware overview cards with a multi-currency fallback", async () => {
  const { buildOverviewCards } = await import("@/app/page");

  const cards = buildOverviewCards(
    [
      { currencyCode: "AUD" },
      { currencyCode: "USD" },
    ],
    {
      filters: {
        storeId: null,
        fulfillment: "all",
        hasIssues: false,
        hasNotes: false,
        search: "",
        sourceSearch: "",
        dateFrom: "2026-03-01",
        dateTo: "2026-03-07",
      },
      totalOrders: 12,
      totalSalesAmount: "1240.00",
      previousSalesAmount: "980.00",
      currencyCodes: ["AUD", "USD"],
      comparisonRange: {
        currentFrom: "2026-03-01",
        currentTo: "2026-03-07",
        previousFrom: "2026-02-22",
        previousTo: "2026-02-28",
      },
      deltaDirection: "up",
      deltaPercentageLabel: "26.5%",
      fulfilledOrders: 10,
      unfulfilledOrders: 2,
      openIssuesCount: 1,
      ordersWithNotesCount: 0,
    },
  );

  expect(cards[0]).toMatchObject({ label: "Selected Sales" });
  expect(cards[0]?.value).toBe("Multi-currency");
  expect(cards[2]).toMatchObject({ label: "Growth", trend: { direction: "up" } });
});
```

- [ ] **Step 2: Run the targeted test to confirm failure**

Run:

```bash
pnpm test -- --run tests/unit/root-page.test.ts
```

Expected: FAIL because the page card builder and overview payload do not expose comparison fields yet.

- [ ] **Step 3: Extend the overview payload and card model**

```ts
export type OverviewCard = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "success" | "danger" | "accent";
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
};
```

```ts
{
  label: "Selected Sales",
  value: salesCard.value,
  hint: salesCard.hint,
  tone: "accent",
}
{
  label: "Previous Sales",
  value: previousSalesCard.value,
  hint: previousSalesCard.hint,
  tone: "default",
}
{
  label: "Growth",
  value: overview.deltaPercentageLabel,
  hint: `${overview.comparisonRange.previousFrom} to ${overview.comparisonRange.previousTo}`,
  tone: overview.deltaDirection === "down" ? "danger" : "success",
  trend: {
    direction: overview.deltaDirection,
    label: overview.deltaDirection === "flat" ? "Flat" : overview.deltaDirection === "up" ? "Up" : "Down",
  },
}
```

- [ ] **Step 4: Keep currency-safe formatting in one utility path**

```ts
export function formatCompactMoneyState(args: {
  amount: string;
  currencyCodes: string[];
  allowMoney: boolean;
}) {
  if (!args.allowMoney || args.currencyCodes.length !== 1) {
    return {
      value: "Multi-currency",
      hint: "Refine to a single-currency scope for a money total",
    };
  }

  return {
    value: formatCurrency(args.amount, args.currencyCodes[0]),
    hint: `Gross order value in ${args.currencyCodes[0]}`,
  };
}
```

- [ ] **Step 5: Re-run the page test**

Run:

```bash
pnpm test -- --run tests/unit/root-page.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the KPI slice**

```bash
git add tests/unit/root-page.test.ts src/app/page.tsx src/components/dashboard/overview-strip.tsx src/components/dashboard/dashboard-utils.ts src/server/orders/order-service.ts
git commit -m "feat: add comparison-aware overview cards"
```

## Task 4: Add Source Search And Widen The Orders Table

**Files:**
- Create: `tests/unit/orders-table.test.tsx`
- Modify: `src/components/dashboard/filter-bar.tsx`
- Modify: `src/components/dashboard/orders-table.tsx`
- Modify: `src/components/dashboard/dashboard-utils.ts`
- Modify: `src/app/globals.css`
- Modify: `src/server/orders/order-service.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the failing table rendering test for attribution columns**

```tsx
it("renders attribution columns and fallback glyphs for missing values", () => {
  render(
    <OrdersTable
      currentQuery=""
      selectedOrderId={null}
      rows={[
        {
          id: 1,
          storeName: "booknookkit.com",
          shopifyOrderNumber: 2454,
          createdAt: "2026-04-03T10:00:00.000Z",
          customerName: "Ada Lovelace",
          customerEmail: "ada@example.com",
          countryCode: "AU",
          currencyCode: "AUD",
          totalPrice: "49.97",
          financialStatus: "PAID",
          fulfillmentStatus: "UNFULFILLED",
          salesChannel: "Online Store",
          landingPagePath: "/products/book-nook-kit",
          referrerHost: "l.facebook.com",
          utmSource: "meta",
          utmMedium: "paid-social",
          utmCampaign: "spring-drop",
          trackingSummary: null,
          hasOpenIssue: false,
          hasNotes: false,
          lastSyncedAt: "2026-04-03T10:20:00.000Z",
        },
      ]}
    />,
  );

  expect(screen.getByText("Sales Channel")).toBeInTheDocument();
  expect(screen.getByText("Landing Page")).toBeInTheDocument();
  expect(screen.getByText("Referrer / Source")).toBeInTheDocument();
  expect(screen.getByText("UTM")).toBeInTheDocument();
  expect(screen.getByText("Online Store")).toBeInTheDocument();
  expect(screen.getByText("/products/book-nook-kit")).toBeInTheDocument();
  expect(screen.getByText("l.facebook.com")).toBeInTheDocument();
  expect(screen.getByText("meta / paid-social / spring-drop")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the table test to confirm failure**

Run:

```bash
pnpm test -- --run tests/unit/orders-table.test.tsx
```

Expected: FAIL because the row type and table headers do not include attribution fields yet.

- [ ] **Step 3: Add the source filter input and thread it into the URL**

```tsx
const [sourceSearch, setSourceSearch] = useState(filters.sourceSearch);

const nextHref = buildPathWithParams(pathname, searchParams.toString(), {
  store: storeId || null,
  fulfillment: fulfillment === "all" ? null : fulfillment,
  search: search || null,
  source: sourceSearch || null,
  from: dateFrom || null,
  to: dateTo || null,
  issues: hasIssues ? "true" : null,
  notes: hasNotes ? "true" : null,
  orderId: null,
});
```

```tsx
<label className="field field--search">
  <span>Channel / Source</span>
  <input
    aria-label="Filter by channel or source"
    value={sourceSearch}
    onChange={(event) => setSourceSearch(event.target.value)}
    placeholder="Meta, Google, Klaviyo, direct"
  />
</label>
```

- [ ] **Step 4: Widen the order row model and table cells**

```ts
type OrderRow = {
  id: number;
  storeName: string;
  shopifyOrderNumber: number;
  createdAt: Date | string;
  customerName: string | null;
  customerEmail: string | null;
  countryCode: string | null;
  currencyCode: string | null;
  totalPrice: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  salesChannel: string | null;
  landingPagePath: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  trackingSummary: string | null;
  hasOpenIssue: boolean;
  hasNotes: boolean;
  lastSyncedAt: Date | string | null;
};
```

```tsx
const rows = await db
  .select({
    id: orders.id,
    storeName: stores.name,
    shopifyOrderNumber: orders.shopifyOrderNumber,
    createdAt: orders.createdAt,
    customerName: orders.customerName,
    customerEmail: orders.customerEmail,
    countryCode: orders.countryCode,
    currencyCode: orders.currencyCode,
    totalPrice: orders.totalPrice,
    financialStatus: orders.financialStatus,
    fulfillmentStatus: orders.fulfillmentStatus,
    salesChannel: orders.salesChannel,
    landingPagePath: orders.landingPagePath,
    referrerHost: orders.referrerHost,
    utmSource: orders.utmSource,
    utmMedium: orders.utmMedium,
    utmCampaign: orders.utmCampaign,
    trackingSummary: orders.trackingSummary,
    hasOpenIssue,
    hasNotes,
    lastSyncedAt: orders.lastSyncedAt,
  })
  .from(orders)
  .innerJoin(stores, eq(stores.id, orders.storeId));
```

```tsx
<th>Date</th>
<th>Sales Channel</th>
<th>Landing Page</th>
<th>Referrer / Source</th>
<th>UTM</th>
```

```tsx
<td>
  <p className="orders-table__primary">{formatDate(row.createdAt)}</p>
  <p className="orders-table__secondary">#{row.shopifyOrderNumber}</p>
</td>
<td>{row.salesChannel ?? "—"}</td>
<td>{shortenPathLabel(row.landingPagePath)}</td>
<td>{row.referrerHost ?? "—"}</td>
<td>{formatUtmSummary(row) || "—"}</td>
```

- [ ] **Step 5: Add table-fit utilities and sticky header styling**

```ts
export function shortenPathLabel(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return value.length > 38 ? `${value.slice(0, 35)}...` : value;
}

export function formatUtmSummary(parts: {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}) {
  return [parts.utmSource, parts.utmMedium, parts.utmCampaign]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
}
```

```css
.orders-table {
  min-width: 1480px;
}

.orders-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(255, 251, 244, 0.96);
}

.orders-table__cell--attribution {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 6: Re-run the table test**

Run:

```bash
pnpm test -- --run tests/unit/orders-table.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit the table slice**

```bash
git add tests/unit/orders-table.test.tsx src/components/dashboard/filter-bar.tsx src/components/dashboard/orders-table.tsx src/components/dashboard/dashboard-utils.ts src/app/globals.css src/server/orders/order-service.ts src/app/page.tsx
git commit -m "feat: widen orders table with attribution context"
```

## Task 5: Verify The Full Dashboard Flow

**Files:**
- Modify: `tests/e2e/dashboard.spec.ts`

- [ ] **Step 1: Extend the dashboard smoke test to cover the new analytics surface**

```ts
test("dashboard renders comparison cards and attribution columns", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Selected Sales")).toBeVisible();
  await expect(page.getByText("Previous Sales")).toBeVisible();
  await expect(page.getByText("Growth")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Sales Channel" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Landing Page" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Referrer / Source" })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test suite**

Run:

```bash
pnpm test -- --run tests/unit/shopify-client.test.ts tests/unit/map-order.test.ts tests/unit/orders-filters.test.ts tests/unit/order-comparison.test.ts tests/unit/root-page.test.ts tests/unit/orders-table.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run the full verification sweep**

Run:

```bash
pnpm lint
pnpm test -- --run
pnpm build
pnpm exec playwright test tests/e2e/dashboard.spec.ts
```

Expected: all commands exit `0`

- [ ] **Step 4: Commit the verification and polish**

```bash
git add tests/e2e/dashboard.spec.ts
git commit -m "test: cover dashboard analytics extension"
```
