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
    let shouldResetSubmitting = true;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: new FormData(form),
      });

      if (response.ok) {
        shouldResetSubmitting = false;
        window.location.href = "/";
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      setError(payload?.error ?? "Unable to log in.");
    } catch {
      setError("Unable to log in.");
    } finally {
      if (shouldResetSubmitting) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          style={{ height: "48px" }}
        />
      </label>

      {error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            borderRadius: "var(--radius-sm)",
            background: "var(--accent-coral-soft)",
            color: "var(--accent-coral)",
            padding: "12px 14px",
            fontSize: "13px",
            border: "1px solid rgba(255, 107, 107, 0.2)"
          }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="button button--primary"
        style={{
          height: "48px",
          width: "100%",
          fontSize: "16px"
        }}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
