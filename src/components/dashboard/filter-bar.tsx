"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { FormEvent, useEffect, useState, useTransition } from "react";
import { buildPathWithParams } from "@/components/dashboard/dashboard-utils";
import type { OrderFilters } from "@/server/orders/filters";

type StoreOption = {
  id: number;
  key: string;
  name: string;
  status: string;
};

type FilterBarProps = {
  stores: StoreOption[];
  filters: OrderFilters;
  basePath?: string;
};

type DatePreset = "today" | "last7" | "last30" | "month";

function hasAdvancedFiltersActive(filters: OrderFilters) {
  return (
    filters.fulfillment !== "all" ||
    Boolean(filters.sourceSearch) ||
    filters.hasIssues ||
    filters.hasNotes ||
    filters.hasChargeback ||
    Boolean(filters.dateFrom || filters.dateTo)
  );
}

function formatUtcDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shiftUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDateRangeForPreset(preset: DatePreset) {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (preset === "today") {
    const formatted = formatUtcDateInput(end);
    return { from: formatted, to: formatted };
  }
  if (preset === "last7") {
    return { from: formatUtcDateInput(shiftUtcDays(end, -6)), to: formatUtcDateInput(end) };
  }
  if (preset === "month") {
    return {
      from: formatUtcDateInput(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))),
      to: formatUtcDateInput(end),
    };
  }
  return { from: formatUtcDateInput(shiftUtcDays(end, -29)), to: formatUtcDateInput(end) };
}

export function FilterBar({ stores, filters, basePath }: FilterBarProps) {
  const pathname = usePathname();
  const effectivePath = basePath ?? pathname;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storeId, setStoreId] = useState(filters.storeId ? String(filters.storeId) : "");
  const [fulfillment, setFulfillment] = useState(filters.fulfillment);
  const [search, setSearch] = useState(filters.search);
  const [sourceSearch, setSourceSearch] = useState(filters.sourceSearch);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filters.dateTo ?? "");
  const [hasIssues, setHasIssues] = useState(filters.hasIssues);
  const [hasNotes, setHasNotes] = useState(filters.hasNotes);
  const [hasChargeback, setHasChargeback] = useState(filters.hasChargeback);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(() => hasAdvancedFiltersActive(filters));
  const [isApplying, startApplyTransition] = useTransition();

  useEffect(() => {
    setStoreId(filters.storeId ? String(filters.storeId) : "");
    setFulfillment(filters.fulfillment);
    setSearch(filters.search);
    setSourceSearch(filters.sourceSearch);
    setDateFrom(filters.dateFrom ?? "");
    setDateTo(filters.dateTo ?? "");
    setHasIssues(filters.hasIssues);
    setHasNotes(filters.hasNotes);
    setHasChargeback(filters.hasChargeback);
    setShowAdvanced(hasAdvancedFiltersActive(filters));
  }, [
    filters.dateFrom, filters.dateTo, filters.hasChargeback, filters.fulfillment,
    filters.hasIssues, filters.hasNotes, filters.search, filters.sourceSearch, filters.storeId,
  ]);

  function buildNextHref(overrides?: Partial<typeof filters & { storeId: string }>) {
    const next = { storeId, fulfillment, search, sourceSearch, dateFrom, dateTo, hasIssues, hasNotes, hasChargeback, ...overrides };
    return buildPathWithParams(effectivePath, searchParams.toString(), {
      store: next.storeId || null,
      fulfillment: next.fulfillment === "all" ? null : next.fulfillment,
      search: next.search || null,
      source: next.sourceSearch || null,
      from: next.dateFrom || null,
      to: next.dateTo || null,
      issues: next.hasIssues ? "true" : null,
      notes: next.hasNotes ? "true" : null,
      chargeback: next.hasChargeback ? "true" : null,
      orderId: null,
    });
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startApplyTransition(() => { router.replace(buildNextHref()); });
  }

  function handleClear() {
    setStoreId(""); setFulfillment("all"); setSearch(""); setSourceSearch("");
    setDateFrom(""); setDateTo(""); setHasIssues(false); setHasNotes(false); setHasChargeback(false);
    setRefreshError(null);
    startApplyTransition(() => { router.replace(effectivePath); });
  }

  function handlePresetClick(preset: DatePreset) {
    const range = getDateRangeForPreset(preset);
    setDateFrom(range.from); setDateTo(range.to);
    startApplyTransition(() => {
      router.replace(buildNextHref({ dateFrom: range.from, dateTo: range.to }));
    });
  }

  async function handleRefresh() {
    setRefreshError(null); setIsRefreshing(true);
    try {
      const res = await fetch("/api/sync/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Number.isFinite(filters.storeId) ? { storeId: filters.storeId } : {}),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setRefreshError("Unable to queue a refresh right now.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: "20px" }}>
      <form onSubmit={handleApply}>
        {/* Primary controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          {/* Store */}
          <select 
            className="select" 
            value={storeId} 
            onChange={(e) => setStoreId(e.target.value)}
            style={{ width: "auto", minWidth: "140px", height: "40px", margin: 0 }}
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.status !== "active" ? " (inactive)" : ""}
              </option>
            ))}
          </select>

          {/* Search */}
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, customers..."
            style={{ flex: 1, minWidth: "200px", height: "40px", margin: 0 }}
          />

          {/* Date presets */}
          <div style={{ display: "flex", gap: "6px" }}>
            {(["today", "last7", "last30", "month"] as DatePreset[]).map((p) => (
              <button key={p} className="button button--ghost" type="button" onClick={() => handlePresetClick(p)}
                style={{ height: 40, padding: "0 10px", fontSize: "12px" }}>
                {p === "today" ? "Today" : p === "last7" ? "7d" : p === "last30" ? "30d" : "Month"}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              style={{ height: 40 }}
            >
              {showAdvanced ? "Less" : "Filters"}
            </button>

            <button className="button button--ghost" type="submit" disabled={isApplying} style={{ height: 40 }}>
              {isApplying ? "…" : "Apply"}
            </button>

            <button
              className="button button--primary"
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ height: 40 }}
            >
              {isRefreshing ? "Syncing…" : "↻ Sync"}
            </button>
          </div>
        </div>

        {/* Advanced */}
        {showAdvanced && (
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "end" }}>
            <div className="field">
              <span>Fulfillment</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button"
                  style={{ 
                    height: 40, padding: "0 12px", fontSize: "12px",
                    background: fulfillment === "all" ? "var(--accent-teal)" : "var(--bg-glass)",
                    color: fulfillment === "all" ? "#000" : "var(--text-secondary)",
                    border: fulfillment === "all" ? "none" : "1px solid var(--border-visible)"
                  }}
                  onClick={() => setFulfillment("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ 
                    height: 40, padding: "0 12px", fontSize: "12px",
                    background: fulfillment === "fulfilled" ? "var(--accent-teal)" : "var(--bg-glass)",
                    color: fulfillment === "fulfilled" ? "#000" : "var(--text-secondary)",
                    border: fulfillment === "fulfilled" ? "none" : "1px solid var(--border-visible)"
                  }}
                  onClick={() => setFulfillment("fulfilled")}
                >
                  Fulfilled
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ 
                    height: 40, padding: "0 12px", fontSize: "12px",
                    background: fulfillment === "unfulfilled" ? "var(--accent-teal)" : "var(--bg-glass)",
                    color: fulfillment === "unfulfilled" ? "#000" : "var(--text-secondary)",
                    border: fulfillment === "unfulfilled" ? "none" : "1px solid var(--border-visible)"
                  }}
                  onClick={() => setFulfillment("unfulfilled")}
                >
                  Unfulfilled
                </button>
              </div>
            </div>
            <label className="field">
              <span>Source</span>
              <input className="input" value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} placeholder="Meta, Google, direct…" />
            </label>
            <label className="field">
              <span>From</span>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>

            {/* Toggles */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {([
                ["hasIssues", hasIssues, setHasIssues, "Issues only"] as const,
                ["hasNotes", hasNotes, setHasNotes, "Notes only"] as const,
                ["hasChargeback", hasChargeback, setHasChargeback, "Chargeback tagged"] as const,
              ] as const).map(([_key, val, setter, label]) => (
                <label
                  key={label}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "8px 12px",
                    border: "1px solid var(--border-visible)",
                    borderRadius: "var(--radius-sm)",
                    background: val ? "var(--accent-teal-soft)" : "transparent",
                    fontSize: "13px",
                    cursor: "pointer",
                    color: val ? "var(--accent-teal)" : "var(--text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => setter(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: "var(--accent-teal)" }}
                  />
                  {label}
                </label>
              ))}
              <button className="button button--ghost" type="button" onClick={handleClear} style={{ height: 36, padding: "0 12px", fontSize: "12px" }}>
                Clear all
              </button>
            </div>
          </div>
        )}
      </form>

      {refreshError && (
        <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--accent-coral)" }}>{refreshError}</p>
      )}
    </div>
  );
}
