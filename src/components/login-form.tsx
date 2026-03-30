"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: new FormData(form),
    });

    if (response.ok) {
      window.location.href = "/";
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setError(payload?.error ?? "Unable to log in.");
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
      <label style={{ display: "grid", gap: "8px" }}>
        <span style={{ fontWeight: 600 }}>Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          style={{
            width: "100%",
            borderRadius: "14px",
            border: "1px solid #d5c7b1",
            background: "#fffdf9",
            padding: "12px 14px",
          }}
        />
      </label>

      {error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            borderRadius: "12px",
            background: "#fbe9e7",
            color: "#8d2f1b",
            padding: "12px 14px",
          }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          border: 0,
          borderRadius: "999px",
          background: "#2f5d50",
          color: "#ffffff",
          padding: "14px 18px",
          fontWeight: 700,
          cursor: isSubmitting ? "wait" : "pointer",
        }}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
