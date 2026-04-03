# Order Analytics And Attribution Extension Design

## Summary

Extend the existing Shopify Order Ops Dashboard with a date-driven analytics layer and a wider operational table. The new slice should help the owner answer three practical questions without turning the app into a BI product:

- how much did we sell in the selected period
- how does that compare to the previous equivalent period
- where did each order come from

This extension stays anchored to order operations. It adds comparison metrics, growth indicators, a stronger date filter model, and best-effort attribution fields such as sales channel, landing page, referrer, and UTM summary.

## Goals

- Make the date filter the primary driver for overview metrics.
- Show selected-period sales and previous-period sales side by side.
- Show growth or decline direction with compact trend indicators.
- Expand the orders table so channel and page context are visible without opening the detail drawer.
- Capture and surface Shopify attribution metadata when available.

## Non-Goals

- A full marketing attribution warehouse
- Conversion rate or session-based analytics
- Guaranteed attribution completeness across all stores
- Replacing dedicated analytics tools such as GA4 or Triple Whale

## UX Changes

### Date-Driven KPI Layer

The top overview area becomes comparison-aware.

Behavior:

- if `from` and `to` are set, all KPI values use that exact range
- the system also computes the immediately preceding range with equal day count
- if no date filter is set, the dashboard defaults to `last 30 days` vs `previous 30 days`

Recommended KPI cards:

- selected-period sales
- previous-period sales
- growth or decline percentage
- selected-period order count
- fulfilled rate
- unfulfilled count
- open issues count

Presentation rules:

- positive movement uses an upward trend treatment
- negative movement uses a downward trend treatment
- near-flat movement uses a neutral treatment
- if the result set spans multiple currencies, sales cards should not fake a combined total
- in multi-currency mode, the UI should clearly label the view as `multi-currency` and still show order-count comparisons

### Wider Orders Table

The orders table should feel like an ops cockpit on desktop, with horizontal scrolling accepted on narrow screens.

Recommended columns:

- store
- order
- date
- customer
- market
- total
- payment
- fulfillment
- sales channel
- landing page
- referrer or source
- utm summary
- tracking
- flags

Display rules:

- long URLs should be shortened for readability
- missing attribution fields render as `—`
- some cells may use two-line compact layouts to preserve scanability
- sticky headers are preferred if they fit the existing table implementation cleanly

### Filter Bar

Existing date filters remain, but their role becomes more important because KPI comparison depends on them.

Add one lightweight attribution filter:

- channel/source search

This should allow quick views such as `meta`, `google`, `klaviyo`, or `direct`.

## Data Model Extension

The current normalized order record should be extended with best-effort attribution fields sourced from Shopify order data.

Suggested `orders` additions:

- `sales_channel`
- `landing_page_path`
- `referrer_url`
- `referrer_host`
- `utm_source`
- `utm_medium`
- `utm_campaign`

Notes:

- all of these fields are nullable
- best-effort normalization is preferred over raw JSON-only storage
- if a raw attribution payload is helpful, it can also be kept in a nullable JSON field, but normalized top-level columns should drive UI filtering and display

## Shopify Mapping

During sync, the mapper should extract attribution-related order metadata when present.

Priority:

1. stable order-level Shopify fields that clearly identify channel or source
2. landing/referrer information already attached to the order
3. UTM-like metadata if exposed directly in the order payload

Normalization rules:

- `sales_channel` should collapse noisy raw values into readable labels
- `landing_page_path` should prefer a path or shortened URL instead of a full verbose string in the table
- `referrer_host` should be derived from referrer URL when possible to support easier filtering
- `utm summary` in the UI can be composed from normalized `utm_source`, `utm_medium`, and `utm_campaign`

## Query And Comparison Logic

The server-side dashboard query layer should compute:

- selected-period totals
- previous-period totals
- delta percentage
- direction state (`up`, `down`, `flat`)

Rules:

- previous period length must exactly match the selected period length
- date boundaries should remain explicit and UTC-safe, consistent with the existing filter logic
- when the selected period has zero previous-period sales, the delta state should avoid divide-by-zero confusion and use a readable fallback

## Testing

Add or extend tests for:

- date-range comparison logic
- previous-period calculation
- multi-currency KPI fallback behavior
- Shopify attribution mapping
- widened table rendering with new attribution columns
- filter parsing for channel/source search

## Rollout Notes

This is an incremental extension to the existing dashboard, not a new product surface. It should preserve the current operational feel while making the overview and table materially more useful for day-to-day monitoring.
