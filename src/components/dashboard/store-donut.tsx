import React from "react";
import { formatCurrencyScope } from "@/components/dashboard/dashboard-utils";

type StorePerformancePoint = {
  storeId: number;
  storeName: string;
  totalOrders: number;
  totalSalesAmount: string;
  chargebackOrdersCount: number;
  fulfilledOrders: number;
  currencyCodes: string[];
};

type StoreDonutProps = {
  data: StorePerformancePoint[];
};

const STORE_COLORS = [
  "#00d4aa",
  "#4a9eff",
  "#f5a623",
  "#ff6b6b",
  "#a78bfa",
  "#34d399",
];

function parseAmount(v: string) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Compute SVG arc path for a donut segment
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const start = {
    x: cx + r * Math.cos(toRad(startAngle - 90)),
    y: cy + r * Math.sin(toRad(startAngle - 90)),
  };
  const end = {
    x: cx + r * Math.cos(toRad(endAngle - 90)),
    y: cy + r * Math.sin(toRad(endAngle - 90)),
  };
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function StoreDonut({ data }: StoreDonutProps) {
  if (data.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
        No store data available.
      </div>
    );
  }

  const totalOrders = data.reduce((sum, s) => sum + s.totalOrders, 0);
  const totalSales = data.reduce((sum, s) => sum + parseAmount(s.totalSalesAmount), 0);

  const cx = 80;
  const cy = 80;
  const r = 64;
  const innerR = 40;

  let currentAngle = 0;
  const segments = data.map((store, i) => {
    const fraction = totalOrders > 0 ? store.totalOrders / totalOrders : 0;
    const angle = fraction * 360;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    return { store, start, end, fraction, color: STORE_COLORS[i % STORE_COLORS.length] };
  });

  return (
    <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
      {/* Donut */}
      <div style={{ flexShrink: 0 }}>
        <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="Store breakdown donut chart">
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={r - innerR} />
          {segments.map(({ store, start, end, color }) =>
            end - start > 0.5 ? (
              <path
                key={store.storeId}
                d={describeArc(cx, cy, (r + innerR) / 2, start, end)}
                fill="none"
                stroke={color}
                strokeWidth={r - innerR}
                strokeLinecap="butt"
                opacity={0.9}
              >
                <title>
                  {store.storeName}: {store.totalOrders} orders
                </title>
              </path>
            ) : null
          )}
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text-primary)" fontFamily="Inter, sans-serif">
            {totalOrders.toLocaleString("en-US")}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="Inter, sans-serif">
            total orders
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
        {segments.map(({ store, color, fraction }) => (
          <div key={store.storeId} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {store.storeName}
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)" }}>
                {store.totalOrders} orders · {Math.round(fraction * 100)}%
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>
                {formatCurrencyScope(store.totalSalesAmount, store.currencyCodes, "", "—").value}
              </p>
              {store.chargebackOrdersCount > 0 && (
                <p style={{ margin: 0, fontSize: "11px", color: "var(--accent-coral)" }}>
                  {store.chargebackOrdersCount} CB
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
