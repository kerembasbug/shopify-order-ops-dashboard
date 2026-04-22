import React from "react";
import Link from "next/link";
import {
  buildPathWithParams,
  formatCurrency,
  formatDate,
  formatLandingPageLabel,
  formatStatusLabel,
  formatUtmSummary,
} from "@/components/dashboard/dashboard-utils";
import {
  StatusPill,
  financialTone,
  fulfillmentTone,
} from "@/components/shared/status-pill";
import { EmptyState } from "@/components/shared/empty-state";

export type OrdersTableRow = {
  id: number;
  storeName: string;
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
  hasOpenIssue: boolean;
  hasNotes: boolean;
  hasEvents: boolean;
  hasChargeback: boolean;
  lastSyncedAt: Date | string | null;
  salesChannel: string | null;
  landingPagePath: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

type OrdersTableProps = {
  rows: OrdersTableRow[];
  currentQuery: string;
  selectedOrderId: number | null;
};

function buildSourceSummary(row: OrdersTableRow) {
  const channel =
    [row.salesChannel, formatLandingPageLabel(row.landingPagePath)]
      .filter(Boolean)
      .join(" · ") || "Direct";
  const utm = formatUtmSummary(row.utmSource, row.utmMedium, row.utmCampaign);
  return { channel, utm: row.referrerHost || utm || "—" };
}

export function OrdersTable({ rows, currentQuery, selectedOrderId }: OrdersTableProps) {
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="panel__header" style={{ padding: "20px 24px 0" }}>
        <div>
          <p className="panel__eyebrow">Order Queue</p>
          <h2 className="panel__title" style={{ fontSize: "16px" }}>Live orders</h2>
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          {rows.length} result{rows.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="table-container" style={{ marginTop: "16px" }}>
        {rows.length === 0 ? (
          <EmptyState
            title="No orders match this filter"
            body="Try broadening the date range, store scope, or removing active filters."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Store</th>
                <th>Source</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = buildPathWithParams("/orders", currentQuery, { orderId: row.id });
                const { channel, utm } = buildSourceSummary(row);
                const isSelected = row.id === selectedOrderId;
                return (
                  <tr
                    key={row.id}
                    style={isSelected ? { background: "var(--accent-teal-soft)" } : undefined}
                  >
                    <td data-label="Order">
                      <Link className="table__link" href={href}>
                        #{row.shopifyOrderNumber}
                      </Link>
                      <p className="table__secondary">
                        Synced {formatDate(row.lastSyncedAt)}
                      </p>
                    </td>
                    <td data-label="Customer">
                      <p className="table__primary">{row.customerName ?? "Unknown"}</p>
                      <p className="table__secondary">{row.customerEmail ?? "—"}</p>
                    </td>
                    <td data-label="Store">
                      <p className="table__primary">{row.storeName}</p>
                      <p className="table__secondary">{row.countryCode ?? "—"}</p>
                    </td>
                    <td data-label="Source">
                      <p className="table__primary" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }} title={channel}>{channel}</p>
                      <p className="table__secondary" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={utm}>{utm}</p>
                    </td>
                    <td data-label="Date">
                      <p className="table__primary">{formatDate(row.createdAt)}</p>
                      <p className="table__secondary">Upd. {formatDate(row.updatedAt)}</p>
                    </td>
                    <td data-label="Amount">
                      <p className="table__primary">{formatCurrency(row.totalPrice, row.currencyCode)}</p>
                      <p className="table__secondary">{row.trackingSummary ?? "Tracking pending"}</p>
                    </td>
                    <td data-label="Status">
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <StatusPill label={formatStatusLabel(row.financialStatus)} tone={financialTone(row.financialStatus)} />
                        <StatusPill label={formatStatusLabel(row.fulfillmentStatus)} tone={fulfillmentTone(row.fulfillmentStatus)} />
                      </div>
                    </td>
                    <td data-label="Flags">
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {row.hasOpenIssue && <StatusPill label="Issue" tone="danger" />}
                        {row.hasChargeback && <StatusPill label="CB" tone="danger" />}
                        {row.hasEvents && <StatusPill label="Msg" tone="warning" />}
                        {row.hasNotes && <StatusPill label="Note" tone="neutral" />}
                        {!row.hasOpenIssue && !row.hasChargeback && !row.hasNotes && !row.hasEvents && (
                          <StatusPill label="Clear" tone="success" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
