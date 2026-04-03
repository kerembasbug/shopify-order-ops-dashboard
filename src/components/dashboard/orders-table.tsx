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

function getCellText(value: string | null | undefined) {
  return value?.trim() ?? "";
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
          <p className="panel__eyebrow">Unified queue</p>
          <h2 className="panel__title">Orders</h2>
        </div>
      </div>

      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Sales Channel</th>
              <th>Landing Page</th>
              <th>Referrer / Source</th>
              <th>UTM</th>
              <th>Market</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Fulfillment</th>
              <th>Tracking</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14}>
                  <div className="orders-table__empty">
                    <h3>No orders match this filter set.</h3>
                    <p>Try broadening the date range, store scope, or issue filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = buildPathWithParams("/", currentQuery, {
                  orderId: row.id,
                });
                const salesChannel = getCellText(row.salesChannel);
                const landingPageLabel = formatLandingPageLabel(row.landingPagePath);
                const referrerHost = getCellText(row.referrerHost);
                const utmSummary = formatUtmSummary(
                  row.utmSource,
                  row.utmMedium,
                  row.utmCampaign,
                );

                return (
                  <tr
                    key={row.id}
                    className={row.id === selectedOrderId ? "orders-table__row--selected" : undefined}
                  >
                    <td>
                      <p className="orders-table__primary">{row.storeName}</p>
                      <p className="orders-table__secondary">
                        Synced {formatDate(row.lastSyncedAt)}
                      </p>
                    </td>
                    <td>
                      <Link className="orders-table__link" href={href}>
                        #{row.shopifyOrderNumber}
                      </Link>
                    </td>
                    <td>
                      <p className="orders-table__primary">{formatDate(row.createdAt)}</p>
                      <p className="orders-table__secondary">
                        Updated {formatDate(row.updatedAt)}
                      </p>
                    </td>
                    <td>
                      <p className="orders-table__primary">{row.customerName ?? "Unknown"}</p>
                      <p className="orders-table__secondary">
                        {row.customerEmail ?? "No email"}
                      </p>
                    </td>
                    <td>
                      <p
                        className="orders-table__primary orders-table__truncate"
                        title={salesChannel || undefined}
                      >
                        {salesChannel || "—"}
                      </p>
                    </td>
                    <td>
                      <p
                        className="orders-table__primary orders-table__truncate"
                        title={landingPageLabel || undefined}
                      >
                        {landingPageLabel || "—"}
                      </p>
                    </td>
                    <td>
                      <p
                        className="orders-table__primary orders-table__truncate"
                        title={referrerHost || undefined}
                      >
                        {referrerHost || "—"}
                      </p>
                    </td>
                    <td>
                      <p
                        className="orders-table__primary orders-table__truncate"
                        title={utmSummary || undefined}
                      >
                        {utmSummary || "—"}
                      </p>
                    </td>
                    <td>{row.countryCode ?? "—"}</td>
                    <td>{formatCurrency(row.totalPrice, row.currencyCode)}</td>
                    <td>
                      <span className={`status-pill status-pill--${getFinancialTone(row.financialStatus)}`}>
                        {formatStatusLabel(row.financialStatus)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${getFulfillmentTone(row.fulfillmentStatus)}`}>
                        {formatStatusLabel(row.fulfillmentStatus)}
                      </span>
                    </td>
                    <td>{row.trackingSummary ?? "Pending"}</td>
                    <td>
                      <div className="flag-list">
                        {row.hasOpenIssue ? <span className="flag-chip flag-chip--danger">Issue</span> : null}
                        {row.hasNotes ? <span className="flag-chip">Note</span> : null}
                        {!row.hasOpenIssue && !row.hasNotes ? (
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
