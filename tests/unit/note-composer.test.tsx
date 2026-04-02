/** @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("NoteComposer", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("posts a trimmed note and refreshes the dashboard", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { NoteComposer } = await import("@/components/dashboard/note-composer");

    render(<NoteComposer orderId={42} />);

    const noteField = screen.getByLabelText("Add note") as HTMLTextAreaElement;
    await userEvent.type(noteField, "  Customer asked for a delivery update.  ");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders/42/notes",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      body: "Customer asked for a delivery update.",
    });

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(noteField.value).toBe("");
  });
});
