"use client";

import { useState, useTransition } from "react";

type AppHeaderProps = {
  storeCount: number;
  activeStoreLabel: string;
};

export function AppHeader({ storeCount, activeStoreLabel }: AppHeaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/logout", {
            method: "POST",
          });

          if (!response.ok) {
            throw new Error("Logout failed");
          }

          window.location.assign("/login");
        } catch {
          setError("Unable to sign out right now.");
        }
      })();
    });
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__brand">
        <p className="dashboard-header__eyebrow">Shopify Order Ops</p>
        <h1>Order desk</h1>
        <p className="dashboard-header__intro">
          Cleaner daily visibility across {storeCount} store{storeCount === 1 ? "" : "s"} with a
          calmer view of sync status, store performance, and order context.
        </p>
      </div>

      <div className="dashboard-header__summary" aria-label="Dashboard summary">
        <div className="dashboard-header__chip">
          <strong>{storeCount}</strong>
          <span>active stores</span>
        </div>
        <div className="dashboard-header__chip dashboard-header__chip--muted">
          <strong>Scope</strong>
          <span>{activeStoreLabel}</span>
        </div>
        <div className="dashboard-header__chip dashboard-header__chip--muted">
          <strong>Sync</strong>
          <span>Manual refresh only</span>
        </div>
      </div>

      <div className="dashboard-header__actions">
        <button
          className="button button--ghost"
          type="button"
          onClick={handleLogout}
          disabled={isPending}
        >
          {isPending ? "Signing out..." : "Sign out"}
        </button>
        {error ? (
          <p aria-live="polite" className="dashboard-header__error">
            {error}
          </p>
        ) : null}
      </div>
    </header>
  );
}
