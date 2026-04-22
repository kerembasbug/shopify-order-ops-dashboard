import React from "react";
import { formatCurrencyScope, formatIsoDateLabel } from "@/components/dashboard/dashboard-utils";

type DailyTrendPoint = {
  date: string;
  totalOrders: number;
  totalSalesAmount: string;
  chargebackOrdersCount: number;
  currencyCodes: string[];
};

type RevenueChartProps = {
  data: DailyTrendPoint[];
};

const WIDTH = 800;
const HEIGHT = 200;
const PADDING = { top: 12, right: 16, bottom: 48, left: 52 };

function parseAmount(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatYLabel(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
        No revenue data in the selected range.
      </div>
    );
  }

  const amounts = data.map((d) => parseAmount(d.totalSalesAmount));
  const maxAmount = Math.max(...amounts, 1);

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const xStep = innerWidth / Math.max(data.length - 1, 1);

  function xAt(i: number) {
    return PADDING.left + i * xStep;
  }

  function yAt(value: number) {
    return PADDING.top + innerHeight - (value / maxAmount) * innerHeight;
  }

  // Build smooth path using cubic bezier
  const points = amounts.map((a, i) => ({ x: xAt(i), y: yAt(a) }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
  }

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${PADDING.top + innerHeight}` +
    ` L ${points[0].x} ${PADDING.top + innerHeight} Z`;

  // Y axis gridlines (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    value: maxAmount * fraction,
    y: yAt(maxAmount * fraction),
  }));

  // X axis labels: show every Nth date to avoid crowding
  const maxLabels = 8;
  const step = Math.max(1, Math.ceil(data.length / maxLabels));

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        style={{ display: "block" }}
        role="img"
        aria-label="Daily revenue chart"
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y gridlines */}
        {yTicks.map(({ value, y }) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={WIDTH - PADDING.right}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
            <text
              x={PADDING.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-muted)"
              fontFamily="Inter, sans-serif"
            >
              {formatYLabel(value)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#revenueGradient)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" />

        {/* Data points and X labels */}
        {data.map((point, i) => {
          const px = xAt(i);
          const py = yAt(amounts[i]);
          const showLabel = i % step === 0 || i === data.length - 1;
          return (
            <g key={point.date}>
              <circle cx={px} cy={py} r="3" fill="#00d4aa" opacity="0.8">
                <title>
                  {formatIsoDateLabel(point.date)}: {formatCurrencyScope(point.totalSalesAmount, point.currencyCodes, "", "No revenue").value} ({point.totalOrders} orders)
                </title>
              </circle>
              {showLabel && (
                <text
                  x={px}
                  y={HEIGHT - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="Inter, sans-serif"
                >
                  {formatIsoDateLabel(point.date).split(",")[0]}
                </text>
              )}
              {/* Chargeback indicator */}
              {point.chargebackOrdersCount > 0 && (
                <circle cx={px} cy={py - 8} r="2.5" fill="var(--accent-coral)" opacity="0.9">
                  <title>{point.chargebackOrdersCount} chargeback(s)</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
