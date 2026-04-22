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
import {
  StatusPill,
  financialTone,
  fulfillmentTone,
  issueTone,
  directionLabel,
} from "@/components/shared/status-pill";
import { EmptyState } from "@/components/shared/empty-state";

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
  basePath?: string;
};

function normalizeTags(tags: string[] | null | undefined) {
  return Array.isArray(tags) ? tags.filter((t) => typeof t === "string" && t.length > 0) : [];
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{title}</h3>
      {count !== undefined && (
        <span style={{ fontSize: "12px", color: "var(--text-muted)", background: "var(--bg-glass)", padding: "2px 8px", borderRadius: "999px", border: "1px solid var(--border-subtle)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

export function OrderDetailSheet({
  orderId,
  order,
  currentQuery,
  basePath = "/",
}: OrderDetailSheetProps) {
  const closeHref = removeQueryParam(basePath, currentQuery, "orderId");

  if (!orderId) return null;

  return (
    <div className="sheet-overlay">
      <Link aria-label="Close order detail" className="sheet-backdrop" href={closeHref} />
      <aside className="sheet-content">
        {!order ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EmptyState title="Order unavailable" body="The selected order could not be loaded. Try another row or refresh." />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sheet-header">
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                  Order Detail
                </p>
                <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
                  #{order.shopifyOrderNumber}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                  {order.storeName}
                </p>
              </div>
              <Link className="button button--ghost" href={closeHref} style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: 36, padding: "0 14px", fontSize: "13px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Close
              </Link>
            </div>

            <div className="sheet-body">
              {/* Chargeback warning */}
              {hasChargebackTag(normalizeTags(order.tagsJson)) && (
                <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--accent-coral-soft)", border: "1px solid rgba(255,107,107,0.2)", color: "var(--accent-coral)", fontSize: "13px" }}>
                  <strong>⚠ Chargeback tag active.</strong> Verify all customer contact history before any fulfillment or refund actions.
                </div>
              )}

              {/* Snapshot */}
              <div className="sheet-section">
                <SectionHeading title="Snapshot" />
                <dl className="meta-grid">
                  {[
                    ["Total", formatCurrency(order.totalPrice, order.currencyCode)],
                    ["Payment", formatStatusLabel(order.financialStatus)],
                    ["Fulfillment", formatStatusLabel(order.fulfillmentStatus)],
                    ["Tracking", order.trackingSummary ?? "Pending"],
                    ["Customer", order.customerName ?? "Unknown"],
                    ["Email", order.customerEmail ?? "—"],
                    ["Market", order.countryCode ?? "—"],
                    ["Tags", formatList(normalizeTags(order.tagsJson))],
                    ["Shopify ID", order.shopifyOrderId],
                    ["Created", formatDateTime(order.createdAt)],
                    ["Updated", formatDateTime(order.updatedAt)],
                    ["Last sync", formatDateTime(order.lastSyncedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="meta-item">
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Attribution */}
              <div className="sheet-section">
                <SectionHeading title="Attribution" />
                <dl className="meta-grid">
                  {[
                    ["Sales channel", order.salesChannel ? formatStatusLabel(order.salesChannel) : "Direct / unknown"],
                    ["Landing page", formatLandingPageLabel(order.landingPagePath) || "—"],
                    ["Referrer", order.referrerHost ?? "—"],
                    ["UTM", formatUtmSummary(order.utmSource, order.utmMedium, order.utmCampaign) || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="meta-item">
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Customer Timeline */}
              <div className="sheet-section">
                <SectionHeading title="Customer Timeline" count={order.customerEvents.length} />
                <div style={{ padding: "10px 12px", background: "var(--accent-blue-soft)", border: "1px solid rgba(74,158,255,0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--accent-blue)", marginBottom: "12px" }}>
                  <strong>MCP-ready.</strong> External automation can write customer messages into this timeline.
                </div>
                {order.customerEvents.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No customer messages yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {order.customerEvents.map((ev) => (
                      <div key={ev.id} style={{ padding: "12px", background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <strong style={{ fontSize: "13px" }}>{ev.title}</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDateTime(ev.occurredAt)}</span>
                        </div>
                        <p style={{ margin: "0 0 6px", fontSize: "13px", color: "var(--text-secondary)" }}>
                          {directionLabel(ev.direction)} · {formatStatusLabel(ev.eventType)} · {ev.channel ?? "Channel unset"} · src:{ev.source}
                        </p>
                        <p style={{ margin: 0, fontSize: "13px" }}>{ev.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fulfillment */}
              <div className="sheet-section">
                <SectionHeading title="Fulfillment" count={order.fulfillments.length} />
                {order.fulfillments.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No fulfillment records yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {order.fulfillments.map((f) => (
                      <div key={f.id} style={{ padding: "12px", background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <StatusPill label={formatStatusLabel(f.status)} tone={f.status?.toUpperCase() === "SUCCESS" ? "success" : "neutral"} />
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(f.fulfilledAt)}</span>
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: "13px" }}>
                          {f.carrier ?? "Unknown carrier"} · {f.trackingNumber ?? "No tracking"}
                        </p>
                        {f.trackingUrl && (
                          <a href={f.trackingUrl} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "var(--accent-teal)" }}>
                            Open tracking →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="sheet-section">
                <SectionHeading title="Notes" count={order.notes.length} />
                <NoteComposer orderId={order.id} />
                {order.notes.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No operator notes yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                    {order.notes.map((note) => (
                      <div key={note.id} style={{ padding: "12px", background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <strong style={{ fontSize: "13px" }}>{note.authorLabel}</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "13px" }}>{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Issues */}
              <div className="sheet-section">
                <SectionHeading title="Issues" count={order.issues.length} />
                <div style={{ padding: "10px 12px", background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>OpenClaw managed.</strong> Issue records are created and updated by the OpenClaw workflow.
                </div>
                {order.issues.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No active issues.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {order.issues.map((issue) => (
                      <div key={issue.id} style={{ padding: "12px", background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <strong style={{ fontSize: "13px" }}>{issue.title}</strong>
                          <StatusPill label={formatStatusLabel(issue.status)} tone={issueTone(issue.status)} />
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {formatStatusLabel(issue.issueType)} · Severity {issue.severity} · {issue.source}
                        </p>
                        <p style={{ margin: 0, fontSize: "13px" }}>{issue.body}</p>
                        {issue.resolvedAt && (
                          <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--accent-teal)" }}>
                            Resolved {formatDateTime(issue.resolvedAt)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
