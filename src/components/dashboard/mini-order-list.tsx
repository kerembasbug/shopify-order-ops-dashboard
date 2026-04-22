import React from "react";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  formatStatusLabel,
} from "@/components/dashboard/dashboard-utils";
import { StatusPill, financialTone, fulfillmentTone } from "@/components/shared/status-pill";

type MiniOrderRow = {
  id: number;
  shopifyOrderNumber: number;
  storeName: string;
  customerName: string | null;
  createdAt: Date | string;
  currencyCode: string | null;
  totalPrice: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  hasChargeback: boolean;
  hasEvents: boolean;
};

type MiniOrderListProps = {
  rows: MiniOrderRow[];
};

export function MiniOrderList({ rows }: MiniOrderListProps) {
  const display = rows.slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {display.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "14px", padding: "24px", margin: 0, textAlign: "center" }}>
          No orders in the current period.
        </p>
      )}
      {display.map((row) => (
        <div
          key={row.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {/* Order number */}
          <div style={{ flexShrink: 0, width: 72 }}>
            <Link
              href={`/?orderId=${row.id}`}
              className="table__link"
              style={{ fontSize: "14px", fontWeight: 600 }}
            >
              #{row.shopifyOrderNumber}
            </Link>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
              {formatDate(row.createdAt)}
            </p>
          </div>

          {/* Customer */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.customerName ?? "Unknown"}
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.storeName}
            </p>
          </div>

          {/* Status pills */}
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            <StatusPill label={formatStatusLabel(row.financialStatus)} tone={financialTone(row.financialStatus)} />
            <StatusPill label={formatStatusLabel(row.fulfillmentStatus)} tone={fulfillmentTone(row.fulfillmentStatus)} />
            {row.hasEvents && (
              <StatusPill label="Msg" tone="warning" />
            )}
            {row.hasChargeback && (
              <StatusPill label="CB" tone="danger" />
            )}
          </div>

          {/* Amount */}
          <div style={{ textAlign: "right", flexShrink: 0, width: 80 }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
              {formatCurrency(row.totalPrice, row.currencyCode)}
            </p>
          </div>
        </div>
      ))}

      {/* Footer link */}
      <div style={{ padding: "12px 20px", borderTop: display.length > 0 ? undefined : undefined }}>
        <Link
          href="/orders"
          style={{ fontSize: "13px", color: "var(--accent-teal)", fontWeight: 500 }}
        >
          View all orders →
        </Link>
      </div>
    </div>
  );
}
