import React from "react";
import {
  formatCurrency,
  formatCurrencyScope,
} from "@/components/dashboard/dashboard-utils";

type KpiData = {
  totalOrders: number;
  totalSalesAmount: string;
  chargebackOrdersCount: number;
  openIssuesCount: number;
  ordersWithNotesCount: number;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  currencyCodes: string[];
  deltaDirection: "up" | "down" | "flat";
  deltaPercentageLabel: string;
  comparisonLabel?: string;
  previousSalesAmount?: string;
  previousCurrencyCodes?: string[];
};

export function KpiCards({ data }: { data: KpiData }) {
  const { value: revenueValue } = formatCurrencyScope(
    data.totalSalesAmount,
    data.currencyCodes,
    "",
    "—"
  );
  
  const { value: prevRevenueValue } = data.previousSalesAmount ? formatCurrencyScope(
    data.previousSalesAmount,
    data.previousCurrencyCodes ?? data.currencyCodes,
    "",
    "—"
  ) : { value: null };

  const fulfillPct =
    data.totalOrders > 0
      ? Math.round((data.fulfilledOrders / data.totalOrders) * 100)
      : 0;

  return (
    <div className="kpi-grid">
      {/* Revenue */}
      <div className="kpi-card kpi-card--teal">
        <div className="kpi-card__label">
          <span>Total Revenue</span>
          <span
            className={`kpi-card__trend kpi-card__trend--${data.deltaDirection}`}
            title={data.comparisonLabel}
          >
            {data.deltaDirection === "up"
              ? `↑ ${data.deltaPercentageLabel}`
              : data.deltaDirection === "down"
              ? `↓ ${data.deltaPercentageLabel}`
              : data.deltaPercentageLabel}
          </span>
        </div>
        <div className="kpi-card__value" style={{ color: "var(--accent-teal)" }}>
          {revenueValue}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
          <span>{data.totalOrders.toLocaleString("en-US")} orders · {fulfillPct}% fulfilled</span>
          {prevRevenueValue && <span title={data.comparisonLabel}>vs {prevRevenueValue}</span>}
        </div>
      </div>

      {/* Orders */}
      <div className="kpi-card">
        <div className="kpi-card__label">
          <span>Orders</span>
          {data.comparisonLabel && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
              {data.comparisonLabel}
            </span>
          )}
        </div>
        <div className="kpi-card__value">
          {data.totalOrders.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {data.fulfilledOrders} fulfilled · {data.unfulfilledOrders} pending
        </div>
      </div>

      {/* Chargebacks */}
      <div className={`kpi-card${data.chargebackOrdersCount > 0 ? " kpi-card--coral" : ""}`}>
        <div className="kpi-card__label">
          <span>Chargebacks</span>
          {data.chargebackOrdersCount > 0 && (
            <span
              className="kpi-card__trend"
              style={{ background: "var(--accent-coral-soft)", color: "var(--accent-coral)" }}
            >
              Action needed
            </span>
          )}
        </div>
        <div
          className="kpi-card__value"
          style={{ color: data.chargebackOrdersCount > 0 ? "var(--accent-coral)" : undefined }}
        >
          {data.chargebackOrdersCount.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {data.chargebackOrdersCount > 0
            ? "Tagged orders need follow-up"
            : "No chargeback tags active"}
        </div>
      </div>

      {/* Open Issues */}
      <div className={`kpi-card${data.openIssuesCount > 0 ? " kpi-card--amber" : ""}`}>
        <div className="kpi-card__label">
          <span>Open Issues</span>
          {data.openIssuesCount > 0 && (
            <span
              className="kpi-card__trend"
              style={{ background: "var(--accent-amber-soft)", color: "var(--accent-amber)" }}
            >
              Review
            </span>
          )}
        </div>
        <div
          className="kpi-card__value"
          style={{ color: data.openIssuesCount > 0 ? "var(--accent-amber)" : undefined }}
        >
          {data.openIssuesCount.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {data.ordersWithNotesCount} order(s) with notes
        </div>
      </div>
    </div>
  );
}
