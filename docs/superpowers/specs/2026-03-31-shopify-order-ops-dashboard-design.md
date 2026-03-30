# Shopify Order Ops Dashboard Design

## Summary

Build a single-user web application that aggregates Shopify orders from multiple stores into one operational dashboard. The app will be deployed from GitHub to Coolify and used as a read-optimized control panel for order visibility, not as the source of truth for fulfillment actions.

Shopify is the primary source for order, payment, fulfillment, and tracking data. The application adds two internal operational layers on top of Shopify data:

- user-authored notes attached to orders
- agent-authored issue records such as disputes, delays, and risk flags

The result is a unified order operations view that shows which orders are fulfilled or unfulfilled, which ones need attention, and what actions or context already exist around them.

## Goals

- Aggregate orders from all connected Shopify stores into one panel.
- Show operationally relevant order status at a glance.
- Support periodic background sync plus manual refresh.
- Provide lightweight top-level metrics tied directly to order operations.
- Allow manual notes on orders.
- Accept issue/problem records from an external OpenClaw agent.
- Keep the first version simple enough to implement and maintain quickly.

## Non-Goals

- Multi-user roles, permissions, or store-level access control
- A full BI or advanced financial analytics platform
- Writing fulfillment or order status changes back into Shopify or DSers
- Replacing DSers as the operational fulfillment tool
- Deep DSers-native workflow visibility beyond what is reflected in Shopify

## Assumptions

- One person will use the application.
- Deployment target is Coolify from a GitHub repository.
- Shopify Admin API access is available for each store.
- DSers remains the fulfillment execution tool, while this app only observes the resulting state surfaced in Shopify.
- OpenClaw can call an internal API endpoint to create issue records.

## Product Scope

### In Scope for MVP

- Multi-store Shopify connection and sync
- Unified order list
- Order detail drawer or detail page
- Filters for fulfillment state, issues, notes, store, date, and search
- Summary cards for operational metrics
- Manual refresh
- Background sync on a schedule
- Internal notes
- Internal issues created by OpenClaw
- Sync run history and visible sync health

### Out of Scope for MVP

- Team collaboration features
- Full reporting suite
- Bulk operational actions
- Shopify embedded app behavior
- DSers direct integration as a primary data source

## Core User Experience

### Main Screen

The main screen has two layers:

1. A lightweight overview strip at the top
2. A unified order operations table below

The overview strip stays intentionally small and operationally focused. It should provide a fast snapshot without turning the application into an analytics product.

Recommended overview cards:

- total orders
- total sales amount
- fulfilled orders
- unfulfilled orders
- open issues count
- orders with notes count
- selected-store or all-store last sync status

Metric scope rule:

- cards reflect the currently selected store and date filters
- if no filter is selected, cards reflect all connected stores within the default list scope

### Unified Orders Table

Each row represents one Shopify order enriched with internal operational metadata.

Recommended visible columns:

- store name
- order number
- created at
- customer name
- country
- total amount
- financial status
- fulfillment status
- tracking present or absent
- issue present or absent
- note present or absent
- last synced at

Recommended filters:

- store
- fulfilled or unfulfilled
- issue present
- notes present
- date range
- search by order number or customer
- manual refresh action

### Order Detail Surface

Selecting an order opens a right-side detail drawer or a dedicated detail page on smaller screens.

The detail surface should show:

- core Shopify order metadata
- fulfillment summary
- tracking details
- note timeline
- issue timeline
- sync metadata

This keeps list scanning and investigation in a single workflow.

## System Architecture

### High-Level Components

- `web-app`: user-facing dashboard
- `api`: internal backend for reads, notes, issues, and refresh triggers
- `sync-worker`: background process that pulls data from Shopify
- `database`: stores normalized Shopify data plus internal operational data
- `scheduler`: triggers recurring sync jobs

### Data Ownership

There are two distinct data layers:

1. Shopify source data
2. Internal operational data

Shopify source data includes order, payment, fulfillment, and tracking information. Internal operational data includes notes and issues. This separation prevents sync jobs from overwriting user or agent context and keeps source truth boundaries clear.

### Sync Model

The application uses:

- scheduled sync as the default freshness model
- manual refresh for on-demand updates

Initial setup performs a bounded historical import. After that, recurring sync uses incremental updates based on the order update timestamp so that only changed records are processed.

Default initial import window:

- import the last 90 days of orders on first connection unless a store-specific override is configured

## Data Model

### `stores`

Stores one record per Shopify shop.

Suggested fields:

- `id`
- `name`
- `shop_domain`
- `api_version`
- `credentials_ref`
- `status`
- `last_successful_sync_at`
- `created_at`
- `updated_at`

### `orders`

Normalized primary copy of each Shopify order.

Suggested fields:

- `id`
- `store_id`
- `shopify_order_id`
- `shopify_order_number`
- `created_at`
- `updated_at`
- `customer_name`
- `customer_email`
- `country_code`
- `currency_code`
- `total_price`
- `financial_status`
- `fulfillment_status`
- `tracking_summary`
- `tags_json`
- `last_synced_at`

Constraints:

- unique on `store_id + shopify_order_id`

### `order_fulfillments`

Stores fulfillment and shipment detail separately so the system can safely support multiple fulfillments per order.

Suggested fields:

- `id`
- `order_id`
- `shopify_fulfillment_id`
- `status`
- `carrier`
- `tracking_number`
- `tracking_url`
- `fulfilled_at`
- `last_synced_at`

### `order_notes`

Stores user-authored notes as append-only records.

Suggested fields:

- `id`
- `order_id`
- `body`
- `author_label`
- `created_at`

### `order_issues`

Stores operational issues created by OpenClaw and potentially manual tools later.

Suggested fields:

- `id`
- `order_id`
- `source`
- `issue_type`
- `status`
- `severity`
- `title`
- `body`
- `metadata_json`
- `created_at`
- `updated_at`
- `resolved_at`

Recommended enums:

- `issue_type`: `dispute`, `delay`, `risk`, `address_problem`, `tracking_problem`, `other`
- `status`: `open`, `investigating`, `resolved`
- `source`: `openclaw`, `manual`, `system`

Important rule:

An order can be fulfilled and still have an open issue. Internal issue state must not be derived exclusively from Shopify fulfillment state.

### `sync_runs`

Stores the execution history for each sync attempt.

Suggested fields:

- `id`
- `store_id`
- `trigger_type`
- `status`
- `started_at`
- `finished_at`
- `orders_scanned`
- `orders_changed`
- `error_message`

Recommended `trigger_type` values:

- `scheduled`
- `manual`
- `initial_import`

## Operational Metrics

The top summary strip should use lightweight derived metrics rather than a separate analytics subsystem.

Recommended approach:

- recalculate summary counts after each sync run
- store a compact cached snapshot for fast UI reads
- refresh the snapshot on manual refresh as part of the same job flow

This keeps the app responsive without introducing unnecessary reporting complexity.

## Integrations

### Shopify

Shopify Admin API is the authoritative source for:

- orders
- financial status
- fulfillment status
- tracking information
- core customer and shipping context

### DSers

DSers is not the primary integration target for MVP. The application observes the downstream status reflected in Shopify rather than attempting to mirror DSers-native internal states.

### OpenClaw

OpenClaw writes issue records into the application through an internal API. That API should accept an order identifier plus issue payload so the dashboard can surface operational problems alongside Shopify data.

Identifier rule:

- internal API writes should target the app's internal `order_id`
- if an external agent only knows Shopify identifiers, the implementation should provide a lookup or resolution step before issue creation

## API Surface

Suggested internal endpoints:

- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/notes`
- `GET /api/orders/:id/issues`
- `POST /api/issues`
- `POST /api/sync/run`
- `GET /api/sync/runs`
- `GET /api/overview`

The OpenClaw-facing endpoint should be authenticated separately from the single-user dashboard session.

## Sync and Failure Handling

### Sync Behavior

- recurring sync runs at the configured default interval
- manual refresh can target all stores or a selected store
- initial import is bounded to a recent historical window to avoid unnecessary first-run cost
- later syncs use incremental updates
- only one active sync per store should run at a time

### Failure Isolation

Each store sync must run independently. If one store hits a token problem, API failure, or rate limit, the other stores must continue syncing.

### Visibility

The UI should show:

- last successful sync time
- whether a sync is in progress
- whether any store currently has a sync error
- recent sync run results

The goal is visible operational trust, not silent failure.

## Security and Access

The application is single-user in MVP, so access can be implemented as a simple authenticated dashboard rather than a full role system.

Security requirements:

- protect the dashboard behind authentication
- store Shopify credentials securely via environment variables or secret references
- authenticate OpenClaw issue-write requests
- log key write operations for notes, issues, and sync triggers

## Deployment

The app will be deployed through Coolify from GitHub.

Deployment expectations:

- one web service for the dashboard and API
- one worker process for scheduled sync jobs if the chosen stack separates them
- one relational database
- environment-driven store credential configuration

## Testing Strategy

Priority tests for MVP:

- Shopify response mapping and normalization
- incremental sync correctness
- preservation of notes and issues across repeated syncs
- filter behavior for fulfilled, unfulfilled, issue, and note states
- sync failure isolation between stores
- overview metric accuracy

Manual verification should also confirm:

- manual refresh updates the UI as expected
- an OpenClaw-created issue appears on the correct order
- a fulfilled order can still display an open issue

## Recommended Implementation Direction

Start with a Shopify-first aggregator architecture and keep the data model extensible toward a richer operations hub later.

This recommendation balances:

- fastest path to usable value
- lower maintenance risk
- clear source-of-truth boundaries
- enough extensibility for future issue and workflow growth

## Open Questions Resolved in This Design

- Data freshness defaults to scheduled sync, with manual refresh available.
- The app is single-user for MVP.
- Deployment target is Coolify via GitHub.
- Shopify is the primary source of truth.
- DSers remains execution infrastructure, not the primary data source.
- OpenClaw writes issue data into the app.
- Top-level sales and operational metrics are included in a lightweight way tied directly to order data.
