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

function getFinancialTone(status: string | null) {
  const normalized = status?.toUpperCase();

  if (normalized === "PAID") {
    return "success";
  }

  if (normalized === "REFUNDED" || normalized === "VOIDED") {
    return "danger";
  }

  return "muted";
}

function getFulfillmentTone(status: string | null) {
  return status?.toUpperCase() === "FULFILLED" ? "success" : "muted";
}

function joinCopy(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim() ?? "").filter(Boolean).join(" • ");
}

function buildSourceSummary(row: OrdersTableRow) {
  return {
    primary:
      joinCopy([
        row.salesChannel,
        formatLandingPageLabel(row.landingPagePath),
      ]) || "Direct / unattributed",
    secondary:
      joinCopy([
        row.referrerHost,
        formatUtmSummary(row.utmSource, row.utmMedium, row.utmCampaign),
      ]) || "No referrer or UTM context",
  };
}

export function OrdersTable({
  rows,
  currentQuery,
  selectedOrderId,
}: OrdersTableProps) {
  return (
    <section className="panel panel--table">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Order queue</p>
          <h2 className="panel__title">Live orders</h2>
        </div>
      </div>

      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Store</th>
              <th>Source</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="orders-table__empty">
                    <h3>No orders match this filter set.</h3>
                    <p>Try broadening the date range, store scope, or tag filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = buildPathWithParams("/", currentQuery, {
                  orderId: row.id,
                });
                const sourceSummary = buildSourceSummary(row);

                return (
                  <tr
                    key={row.id}
                    className={row.id === selectedOrderId ? "orders-table__row--selected" : undefined}
                  >
                    <td>
                      <Link className="orders-table__link" href={href}>
                        #{row.shopifyOrderNumber}
                      </Link>
                      <p className="orders-table__secondary">
                        Synced {formatDate(row.lastSyncedAt)}
                      </p>
                    </td>
                    <td>
                      <p className="orders-table__primary">{row.customerName ?? "Unknown"}</p>
                      <p className="orders-table__secondary">
                        {row.customerEmail ?? "No email"}
                      </p>
                    </td>
                    <td>
                      <p className="orders-table__primary">{row.storeName}</p>
                      <p className="orders-table__secondary">{row.countryCode ?? "—"}</p>
                    </td>
                    <td>
                      <p
                        className="orders-table__primary orders-table__truncate"
                        title={sourceSummary.primary}
                      >
                        {sourceSummary.primary}
                      </p>
                      <p
                        className="orders-table__secondary orders-table__truncate"
                        title={sourceSummary.secondary}
                      >
                        {sourceSummary.secondary}
                      </p>
                    </td>
                    <td>
                      <p className="orders-table__primary">{formatDate(row.createdAt)}</p>
                      <p className="orders-table__secondary">
                        Updated {formatDate(row.updatedAt)}
                      </p>
                    </td>
                    <td>
                      <p className="orders-table__primary">
                        {formatCurrency(row.totalPrice, row.currencyCode)}
                      </p>
                      <p className="orders-table__secondary">
                        {row.trackingSummary ?? "Tracking pending"}
                      </p>
                    </td>
                    <td>
                      <div className="orders-table__status-stack">
                        <span className={`status-pill status-pill--${getFinancialTone(row.financialStatus)}`}>
                          {formatStatusLabel(row.financialStatus)}
                        </span>
                        <span className={`status-pill status-pill--${getFulfillmentTone(row.fulfillmentStatus)}`}>
                          {formatStatusLabel(row.fulfillmentStatus)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flag-list">
                        {row.hasOpenIssue ? <span className="flag-chip flag-chip--danger">Issue</span> : null}
                        {row.hasNotes ? <span className="flag-chip">Note</span> : null}
                        {row.hasChargeback ? (
                          <span className="flag-chip flag-chip--warning">Chargeback</span>
                        ) : null}
                        {!row.hasOpenIssue && !row.hasNotes && !row.hasChargeback ? (
                          <span className="flag-chip flag-chip--muted">Clear</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
