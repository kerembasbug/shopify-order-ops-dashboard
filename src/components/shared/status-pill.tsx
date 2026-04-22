import React from "react";

type StatusTone = "success" | "warning" | "danger" | "neutral";

type StatusPillProps = {
  label: string;
  tone: StatusTone;
};

export function StatusPill({ label, tone }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${tone}`}>{label}</span>
  );
}

export function financialTone(status: string | null): StatusTone {
  const s = status?.toUpperCase();
  if (s === "PAID") return "success";
  if (s === "REFUNDED" || s === "VOIDED") return "danger";
  if (s === "PENDING") return "warning";
  return "neutral";
}

export function fulfillmentTone(status: string | null): StatusTone {
  const s = status?.toUpperCase();
  if (s === "FULFILLED") return "success";
  if (s === "PARTIAL") return "warning";
  return "neutral";
}

export function issueTone(status: string): StatusTone {
  if (status === "open") return "danger";
  if (status === "investigating") return "warning";
  return "success";
}

export function directionLabel(direction: string) {
  return direction === "inbound" ? "← Inbound" : "→ Outbound";
}
