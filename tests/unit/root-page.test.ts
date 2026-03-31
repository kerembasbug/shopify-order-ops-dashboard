import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage auth protection", () => {
  beforeEach(() => {
    globalThis.React = React;
    cookiesMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated requests to /login", async () => {
    cookiesMock.mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const { default: HomePage } = await import("@/app/page");

    await expect(
      Promise.resolve().then(() => HomePage()),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
