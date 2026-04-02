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
        <div className="dashboard-header__title-row">
          <div>
            <h1>Ops ledger</h1>
            <p>
              Single-owner visibility across {storeCount} store{storeCount === 1 ? "" : "s"}.
            </p>
          </div>
          <dl className="dashboard-header__meta">
            <div>
              <dt>Scope</dt>
              <dd>{activeStoreLabel}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>Scheduled sync + manual refresh</dd>
            </div>
          </dl>
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
