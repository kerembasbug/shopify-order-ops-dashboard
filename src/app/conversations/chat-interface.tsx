"use client";

import { useState, useTransition } from "react";
import { formatDateTime } from "@/components/dashboard/dashboard-utils";

type CustomerEventDetail = {
  id: number;
  source: string;
  eventType: string;
  direction: string;
  channel: string | null;
  title: string;
  body: string;
  occurredAt: Date | string;
};

type OrderInfo = {
  id: number;
  shopifyOrderNumber: number;
  customerName: string | null;
  storeName: string;
};

type ChatInterfaceProps = {
  order: OrderInfo;
  events: CustomerEventDetail[];
};

export function ChatInterface({ order, events }: ChatInterfaceProps) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sort events chronologically (oldest first for chat view)
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;

    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/orders/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              body,
              direction: "outbound",
              channel: "dashboard",
            }),
          });
          
          if (!res.ok) throw new Error("Failed to send message");
          
          setBody("");
          window.location.reload(); // Simple reload to get fresh data
        } catch {
          setError("Failed to send message. Please try again.");
        }
      })();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px" }}>#{order.shopifyOrderNumber} - {order.customerName ?? "Unknown"}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>{order.storeName}</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {sortedEvents.map((ev) => {
          const isOutbound = ev.direction === "outbound";
          return (
            <div key={ev.id} style={{ display: "flex", flexDirection: "column", alignItems: isOutbound ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {isOutbound ? "You (Operator)" : "Customer"}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatDateTime(ev.occurredAt)}
                </span>
              </div>
              <div style={{
                padding: "12px 16px",
                borderRadius: isOutbound ? "16px 16px 0 16px" : "16px 16px 16px 0",
                background: isOutbound ? "var(--accent-teal)" : "var(--bg-glass)",
                color: isOutbound ? "#000" : "var(--text-primary)",
                maxWidth: "75%",
                border: isOutbound ? "none" : "1px solid var(--border-subtle)",
                fontSize: "14px",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap"
              }}>
                {ev.body}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                via {ev.channel ?? "unknown"} ({ev.source})
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
        {error && <p style={{ margin: "0 0 10px", fontSize: "12px", color: "var(--accent-coral)" }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message to the customer (via MCP)..."
            className="textarea"
            style={{ flex: 1, minHeight: "60px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <button 
            type="submit" 
            className="button button--primary"
            disabled={isPending || !body.trim()}
            style={{ height: "40px" }}
          >
            {isPending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
