"use client";

import React, { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type NoteComposerProps = {
  orderId: number;
};

export function NoteComposer({ orderId }: NoteComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setError("Enter a note before saving.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: trimmedBody }),
      });

      if (!response.ok) {
        throw new Error("save_failed");
      }

      setBody("");
      router.refresh();
    } catch {
      setError("Unable to save this note right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="note-composer" onSubmit={handleSubmit}>
      <label className="field note-composer__field">
        <span>Add note</span>
        <textarea
          aria-label="Add note"
          className="note-composer__input"
          name="body"
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share the latest operator context for this order."
          disabled={isSaving}
        />
      </label>

      <div className="note-composer__actions">
        <button className="button button--accent" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save note"}
        </button>
        <p className="note-composer__hint">Notes are visible in the order timeline after refresh.</p>
      </div>

      {error ? (
        <p aria-live="polite" className="panel__error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
