import React from "react";
import { formatDateTime, formatDuration } from "@/components/dashboard/dashboard-utils";
import { StatusPill } from "@/components/shared/status-pill";

type SyncRunItem = {
  id: number;
  storeName: string;
  triggerType: string;
  status: string;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  ordersScanned: number;
  ordersChanged: number;
  errorMessage: string | null;
};

function syncTone(status: string) {
  if (status === "succeeded") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "running") return "warning" as const;
  return "neutral" as const;
}

export function SyncStatusCard({ runs }: { runs: SyncRunItem[] }) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Sync Activity</p>
          <h2 className="panel__title" style={{ fontSize: "16px" }}>Recent syncs</h2>
        </div>
      </div>

      {runs.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No sync runs recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {runs.map((run) => (
            <div
              key={run.id}
              style={{
                padding: "14px",
                background: "var(--bg-glass)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>{run.storeName}</p>
                <StatusPill label={run.status} tone={syncTone(run.status)} />
              </div>
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                {run.triggerType} · {formatDateTime(run.startedAt)} · {formatDuration(run.startedAt, run.finishedAt)}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ fontSize: "12px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Scanned </span>
                  <strong>{run.ordersScanned}</strong>
                </div>
                <div style={{ fontSize: "12px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Changed </span>
                  <strong>{run.ordersChanged}</strong>
                </div>
              </div>
              {run.errorMessage && (
                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--accent-coral)" }}>
                  {run.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
