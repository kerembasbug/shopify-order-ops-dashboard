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
};

export function FilterBar({ stores, filters }: FilterBarProps) {
  const pathname = usePathname();
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
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.fulfillment,
    filters.hasIssues,
    filters.hasNotes,
    filters.search,
    filters.sourceSearch,
    filters.storeId,
  ]);

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextHref = buildPathWithParams(pathname, searchParams.toString(), {
      store: storeId || null,
      fulfillment: fulfillment === "all" ? null : fulfillment,
      search: search || null,
      source: sourceSearch || null,
      from: dateFrom || null,
      to: dateTo || null,
      issues: hasIssues ? "true" : null,
      notes: hasNotes ? "true" : null,
      orderId: null,
    });

    startApplyTransition(() => {
      router.replace(nextHref);
    });
  }

  function handleClear() {
    setStoreId("");
    setFulfillment("all");
    setSearch("");
    setSourceSearch("");
    setDateFrom("");
    setDateTo("");
    setHasIssues(false);
    setHasNotes(false);
    setRefreshError(null);

    startApplyTransition(() => {
      router.replace(pathname);
    });
  }

  async function handleRefresh() {
    setRefreshError(null);
    setIsRefreshing(true);

    try {
      const parsedStoreId = filters.storeId;
      const response = await fetch("/api/sync/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          Number.isFinite(parsedStoreId) ? { storeId: parsedStoreId } : {},
        ),
      });

      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      router.refresh();
    } catch {
      setRefreshError("Unable to queue a refresh right now.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="panel panel--filters">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Command bar</p>
          <h2 className="panel__title">Filter the order stream</h2>
        </div>
      </div>

      <form className="filter-bar" onSubmit={handleApply}>
        <label className="field">
          <span>Store</span>
          <select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
            <option value="">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
                {store.status !== "active" ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Fulfillment</span>
          <select
            value={fulfillment}
            onChange={(event) =>
              setFulfillment(event.target.value as OrderFilters["fulfillment"])
            }
          >
            <option value="all">All statuses</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="unfulfilled">Unfulfilled</option>
          </select>
        </label>

        <label className="field field--search">
          <span>Search</span>
          <input
            aria-label="Search orders"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Order, customer, email"
          />
        </label>

        <label className="field field--source">
          <span>Source</span>
          <input
            aria-label="Search order sources"
            value={sourceSearch}
            onChange={(event) => setSourceSearch(event.target.value)}
            placeholder="Meta, Google, Klaviyo, direct"
          />
        </label>

        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>

        <label className="field">
          <span>To</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={hasIssues}
            onChange={(event) => setHasIssues(event.target.checked)}
          />
          <span>Issues only</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={hasNotes}
            onChange={(event) => setHasNotes(event.target.checked)}
          />
          <span>Notes only</span>
        </label>

        <div className="filter-bar__actions">
          <button className="button" type="submit" disabled={isApplying}>
            {isApplying ? "Applying..." : "Apply filters"}
          </button>
          <button className="button button--ghost" type="button" onClick={handleClear}>
            Clear
          </button>
          <button
            className="button button--accent"
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh now"}
          </button>
        </div>
      </form>

      {refreshError ? (
        <p aria-live="polite" className="panel__error">
          {refreshError}
        </p>
      ) : null}
    </section>
  );
}
