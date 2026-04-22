# Shopify Order Ops Dashboard

Single-user Shopify order operations dashboard with a separate worker for sync jobs, OpenClaw-managed issue visibility, and Coolify-friendly deployment assets.

## Services

- `web`: Next.js dashboard and HTTP API
- `worker`: `pnpm worker`
- `db`: PostgreSQL

## Local Setup

Use Node `22.12+` locally, or run the app through Docker/Coolify so the bundled Node image handles it for you.

1. Copy `.env.example` into your environment configuration.
2. Install dependencies with `pnpm install`.
3. Run migrations with `pnpm db:migrate`.
4. Start the dashboard with `pnpm dev`.
5. Start the worker in a second terminal with `pnpm worker`.

## Coolify Setup

1. Create a PostgreSQL service and capture its connection string.
2. Add a web service from this GitHub repo using the included `Dockerfile`.
3. Set the startup command for the web service to `pnpm start`.
4. Add a second service from the same repo for the worker and point it at `Dockerfile.worker`.
5. Configure the same environment variables on both services:
   - `DATABASE_URL`
   - `APP_PASSWORD`
   - `APP_SESSION_SECRET`
   - `INTERNAL_CRON_SECRET`
   - `OPENCLAW_API_KEY`
   - `SHOPIFY_STORES_JSON`
6. Run `pnpm db:migrate` once against the production database before opening the app.
7. Route the public domain only to the web service; the worker stays private.

## Operational Notes

- Manual sync requests enqueue `sync-store` jobs in Postgres through `pg-boss`.
- The worker does not register a recurring sync schedule; refresh runs only when triggered manually.
- The worker also bootstraps configured stores on startup, so renamed or inactive stores reconcile before sync begins.
- The `/api/internal/sync/scheduled` endpoint is a legacy fallback trigger and should stay disabled unless intentionally wired.
