"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    href: "/chargebacks",
    label: "Chargebacks",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    href: "/conversations",
    label: "Messages",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLogout() {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/auth/logout", { method: "POST" });
          if (!res.ok) throw new Error("Logout failed");
          window.location.assign("/login");
        } catch {
          setError("Sign out failed");
        }
      })();
    });
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar__brand" aria-label="Shopify Order Ops">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.31 2.03c-.06-.03-.15 0-.19.09l-.12.33a2.75 2.75 0 00-1.73-.6 4.42 4.42 0 00-4.15 3.6l-2.96 1.67a.5.5 0 00-.25.43l-.01 8.65a.5.5 0 00.25.44l7.6 4.39a.5.5 0 00.5 0l7.6-4.39a.5.5 0 00.25-.44V8.3l.09-.26a.15.15 0 00-.07-.18l-7.01-3.83zM3 7.97a.5.5 0 00-.25.43v8.65a.5.5 0 00.25.44l7.6 4.39a.5.5 0 00.5 0v-8.65L3.5 7.97A.5.5 0 003 7.97z" />
        </svg>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__link${isActive ? " sidebar__link--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="sidebar__bottom">
        <button
          className="sidebar__link"
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          title={isPending ? "Signing out…" : "Sign out"}
          aria-label={error ?? (isPending ? "Signing out…" : "Sign out")}
          style={{ background: "none", color: error ? "var(--accent-coral)" : undefined }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{isPending ? "…" : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}
