import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";
import { getConversationsList } from "@/server/orders/conversations";
import { listCustomerEventsForOrder } from "@/server/orders/customer-events";
import { ChatInterface } from "./chat-interface";
import { formatDateTime } from "@/components/dashboard/dashboard-utils";

export const dynamic = "force-dynamic";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) redirect("/login");
  const session = await getSessionFromToken(sessionToken, getEnv().appSessionSecret);
  if (!session) redirect("/login");

  const resolvedParams = await Promise.resolve(searchParams ?? {});
  const orderIdParam = resolvedParams.orderId;
  const activeOrderId = orderIdParam ? Number.parseInt(Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam, 10) : null;

  const conversations = await getConversationsList();
  
  // If an order is selected, load all its events
  let activeEvents: any[] = [];
  let activeOrderInfo = null;

  if (activeOrderId) {
    activeEvents = await listCustomerEventsForOrder(activeOrderId);
    const convMatch = conversations.find(c => c.order.id === activeOrderId);
    if (convMatch) {
      activeOrderInfo = {
        id: convMatch.order.id,
        shopifyOrderNumber: convMatch.order.shopifyOrderNumber,
        customerName: convMatch.order.customerName,
        storeName: convMatch.store.name
      };
    }
  } else if (conversations.length > 0) {
    // Select first by default if none selected
    redirect(`/conversations?orderId=${conversations[0].order.id}`);
  }

  return (
    <div>
      <div className="top-bar">
        <div className="top-bar__title">
          <h1>Messages</h1>
          <p className="top-bar__subtitle">Customer conversations synced via MCP</p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="panel" style={{ padding: "60px", textAlign: "center" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--border-visible)", marginBottom: "16px" }}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <h2 style={{ fontSize: "18px", margin: "0 0 8px" }}>No conversations found</h2>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>
            When MCP agents sync customer events, they will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px" }}>
          {/* Conversation List */}
          <div className="panel" style={{ padding: 0, height: "calc(100vh - 180px)", overflowY: "auto" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1, backdropFilter: "blur(8px)" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Recent Activity</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {conversations.map((conv) => {
                const isActive = activeOrderId === conv.order.id;
                return (
                  <Link 
                    key={conv.order.id} 
                    href={`/conversations?orderId=${conv.order.id}`}
                    style={{ 
                      padding: "16px 20px", 
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isActive ? "var(--bg-glass)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--accent-teal)" : "3px solid transparent",
                      display: "block",
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "14px" }}>{conv.order.customerName ?? "Unknown"}</strong>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDateTime(conv.event.occurredAt).split(',')[0]}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--accent-teal)", marginBottom: "4px" }}>
                      #{conv.order.shopifyOrderNumber} · {conv.store.name}
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: "13px", 
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {conv.event.direction === "inbound" ? "↓" : "↑"} {conv.event.body}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Chat Interface */}
          {activeOrderInfo ? (
            <ChatInterface order={activeOrderInfo} events={activeEvents} />
          ) : (
            <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              Select a conversation to view details
            </div>
          )}
        </div>
      )}
    </div>
  );
}
