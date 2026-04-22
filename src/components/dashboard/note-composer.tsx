"use client";

import { useState, useTransition } from "react";

type NoteComposerProps = {
  orderId: number;
};

export function NoteComposer({ orderId }: NoteComposerProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/orders/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, body }),
          });
          if (!res.ok) throw new Error("Failed to save note");
          setBody("");
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
          window.location.reload();
        } catch {
          setError("Could not save the note. Please try again.");
        }
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
      <textarea
        className="textarea"
        placeholder="Add an operator note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={1}
        style={{ width: "100%", minHeight: "80px" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        {error && <p style={{ margin: 0, fontSize: "12px", color: "var(--accent-coral)" }}>{error}</p>}
        {success && <p style={{ margin: 0, fontSize: "12px", color: "var(--accent-teal)" }}>Note saved.</p>}
        {!error && !success && <span />}
        <button
          className="button button--primary"
          type="submit"
          disabled={isPending || !body.trim()}
          style={{ height: 36, padding: "0 14px", fontSize: "13px" }}
        >
          {isPending ? "Saving…" : "Save note"}
        </button>
      </div>
    </form>
  );
}
