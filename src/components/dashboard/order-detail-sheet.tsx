import React from "react";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatList,
  formatLandingPageLabel,
  formatStatusLabel,
  formatUtmSummary,
  removeQueryParam,
} from "@/components/dashboard/dashboard-utils";
import { NoteComposer } from "@/components/dashboard/note-composer";
import { hasChargebackTag } from "@/server/orders/chargeback";

type FulfillmentDetail = {
  id: number;
  status: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  fulfilledAt: Date | string | null;
};

type NoteDetail = {
  id: number;
  body: string;
  authorLabel: string;
  createdAt: Date | string;
};

type IssueDetail = {
  id: number;
  source: string;
  issueType: string;
  status: string;
  severity: number;
  title: string;
  body: string;
  createdAt: Date | string;
  resolvedAt: Date | string | null;
};

type CustomerEventDetail = {
  id: number;
  source: string;
  eventType: string;
  direction: string;
  channel: string | null;
  title: string;
  body: string;
  occurredAt: Date | string;
  createdAt: Date | string;
};

type OrderDetail = {
  id: number;
  storeName: string;
  shopifyOrderId: string;
  shopifyOrderNumber: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  customerName: string | null;
  customerEmail: string | null;
  countryCode: string | null;
  currencyCode: string | null;
  totalPrice: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  trackingSummary: string | null;
  salesChannel?: string | null;
  landingPagePath?: string | null;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  tagsJson: string[];
  lastSyncedAt: Date | string | null;
  storeLastSuccessfulSyncAt: Date | string | null;
  fulfillments: FulfillmentDetail[];
  notes: NoteDetail[];
  issues: IssueDetail[];
  customerEvents: CustomerEventDetail[];
};

type OrderDetailSheetProps = {
  orderId: number | null;
  order: OrderDetail | null;
  currentQuery: string;
};

function normalizeTags(tags: string[] | null | undefined) {
  return Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string" && tag.length > 0) : [];
}

export function OrderDetailSheet({
  orderId,
  order,
  currentQuery,
}: OrderDetailSheetProps) {
  const closeHref = removeQueryParam("/", currentQuery, "orderId");

  if (!orderId) {
    return (
      <aside className="detail-sheet detail-sheet--empty">
        <div className="detail-sheet__empty-state">
          <p className="panel__eyebrow">Order detail</p>
          <h2>Select an order</h2>
          <p>Choose a row from the ledger to inspect notes, issues, and fulfillment history.</p>
        </div>
      </aside>
    );
  }

  if (!order) {
    return (
      <aside className="detail-sheet detail-sheet--empty">
        <div className="detail-sheet__empty-state">
          <p className="panel__eyebrow">Order detail</p>
          <h2>Order unavailable</h2>
          <p>The selected order could not be loaded. Try another row or refresh the dashboard.</p>
          <Link className="button button--ghost" href={closeHref}>
            Close
          </Link>
        </div>
      </aside>
    );
  }

  const tags = normalizeTags(order.tagsJson);
  const chargebackTracked = hasChargebackTag(tags);
  const attributionSummary = formatUtmSummary(
    order.utmSource,
    order.utmMedium,
    order.utmCampaign,
  );

  return (
    <aside className="detail-sheet">
      <div className="detail-sheet__header">
        <div>
          <p className="panel__eyebrow">Order detail</p>
          <h2>#{order.shopifyOrderNumber}</h2>
          <p className="detail-sheet__subtitle">{order.storeName}</p>
        </div>
        <Link className="button button--ghost" href={closeHref}>
          Close
        </Link>
      </div>

      <section className="detail-sheet__section">
        <h3>Snapshot</h3>
        <dl className="detail-sheet__meta">
          <div>
            <dt>Total</dt>
            <dd>{formatCurrency(order.totalPrice, order.currencyCode)}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{formatStatusLabel(order.financialStatus)}</dd>
          </div>
          <div>
            <dt>Fulfillment</dt>
            <dd>{formatStatusLabel(order.fulfillmentStatus)}</dd>
          </div>
          <div>
            <dt>Tracking</dt>
            <dd>{order.trackingSummary ?? "Pending"}</dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>{order.customerName ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{order.customerEmail ?? "No email"}</dd>
          </div>
          <div>
            <dt>Market</dt>
            <dd>{order.countryCode ?? "—"}</dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd>{formatList(tags)}</dd>
          </div>
          <div>
            <dt>Shopify ID</dt>
            <dd>{order.shopifyOrderId}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(order.createdAt)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(order.updatedAt)}</dd>
          </div>
          <div>
            <dt>Order sync</dt>
            <dd>{formatDateTime(order.lastSyncedAt)}</dd>
          </div>
          <div>
            <dt>Store sync</dt>
            <dd>{formatDateTime(order.storeLastSuccessfulSyncAt)}</dd>
          </div>
        </dl>

        {chargebackTracked ? (
          <div className="detail-sheet__callout detail-sheet__callout--warning" role="note">
            <strong>Chargeback tag is active.</strong> Keep this order in the dispute watchlist and
            verify all customer contact history before refund or fulfillment actions.
          </div>
        ) : null}
      </section>

      <section className="detail-sheet__section">
        <div className="detail-sheet__section-heading">
          <h3>Attribution</h3>
          <p>Source context</p>
        </div>
        <dl className="detail-sheet__meta">
          <div>
            <dt>Sales channel</dt>
            <dd>{order.salesChannel ? formatStatusLabel(order.salesChannel) : "Direct / unknown"}</dd>
          </div>
          <div>
            <dt>Landing page</dt>
            <dd>{formatLandingPageLabel(order.landingPagePath) || "—"}</dd>
          </div>
          <div>
            <dt>Referrer</dt>
            <dd>{order.referrerHost ?? "—"}</dd>
          </div>
          <div>
            <dt>UTM</dt>
            <dd>{attributionSummary || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-sheet__section">
        <div className="detail-sheet__section-heading">
          <h3>Customer timeline</h3>
          <p>{order.customerEvents.length} item(s)</p>
        </div>
        <div className="detail-sheet__callout" role="note">
          <strong>MCP-ready.</strong> External automation can write customer messages, follow-up
          context, and support metadata into this timeline.
        </div>
        {order.customerEvents.length === 0 ? (
          <p className="detail-sheet__empty-copy">No customer messages or external context yet.</p>
        ) : (
          <ul className="detail-sheet__list">
            {order.customerEvents.map((event) => (
              <li key={event.id}>
                <div className="detail-sheet__list-heading">
                  <strong>{event.title}</strong>
                  <span>{formatDateTime(event.occurredAt)}</span>
                </div>
                <p>
                  {formatStatusLabel(event.direction)} • {formatStatusLabel(event.eventType)} •{" "}
                  {event.channel ? formatStatusLabel(event.channel) : "Channel unspecified"} • Source{" "}
                  {event.source}
                </p>
                <p>{event.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detail-sheet__section">
        <div className="detail-sheet__section-heading">
          <h3>Fulfillment</h3>
          <p>{order.fulfillments.length} record(s)</p>
        </div>
        {order.fulfillments.length === 0 ? (
          <p className="detail-sheet__empty-copy">No fulfillment records yet.</p>
        ) : (
          <ul className="detail-sheet__list">
            {order.fulfillments.map((fulfillment) => (
              <li key={fulfillment.id}>
                <div className="detail-sheet__list-heading">
                  <strong>{formatStatusLabel(fulfillment.status)}</strong>
                  <span>{formatDate(fulfillment.fulfilledAt)}</span>
                </div>
                <p>
                  {fulfillment.carrier ?? "Unknown carrier"} •{" "}
                  {fulfillment.trackingNumber ?? "No tracking number"}
                </p>
                {fulfillment.trackingUrl ? (
                  <a href={fulfillment.trackingUrl} target="_blank" rel="noreferrer">
                    Open tracking
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detail-sheet__section">
        <div className="detail-sheet__section-heading">
          <h3>Notes</h3>
          <p>{order.notes.length} item(s)</p>
        </div>
        <NoteComposer orderId={order.id} />
        {order.notes.length === 0 ? (
          <p className="detail-sheet__empty-copy">No operator notes yet.</p>
        ) : (
          <ul className="detail-sheet__list">
            {order.notes.map((note) => (
              <li key={note.id}>
                <div className="detail-sheet__list-heading">
                  <strong>{note.authorLabel}</strong>
                  <span>{formatDateTime(note.createdAt)}</span>
                </div>
                <p>{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detail-sheet__section">
        <div className="detail-sheet__section-heading">
          <h3>Issues</h3>
          <p>{order.issues.length} item(s)</p>
        </div>
        <div className="detail-sheet__callout" role="note">
          <strong>OpenClaw agent managed.</strong> Issue and dispute records are created and
          updated by the OpenClaw workflow, so the dashboard stays read-only for issue handling.
        </div>
        {order.issues.length === 0 ? (
          <p className="detail-sheet__empty-copy">No active dispute or issue records.</p>
        ) : (
          <ul className="detail-sheet__list">
            {order.issues.map((issue) => (
              <li key={issue.id}>
                <div className="detail-sheet__list-heading">
                  <strong>{issue.title}</strong>
                  <span>{formatDateTime(issue.createdAt)}</span>
                </div>
                <p>
                  {formatStatusLabel(issue.issueType)} • Severity {issue.severity} •{" "}
                  {formatStatusLabel(issue.status)} • Source {issue.source}
                </p>
                <p>{issue.body}</p>
                {issue.resolvedAt ? <p>Resolved {formatDateTime(issue.resolvedAt)}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
