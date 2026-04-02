import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const getEnvMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/server/env", () => ({
  getEnv: getEnvMock,
}));

describe("HomePage auth protection", () => {
  beforeEach(() => {
    globalThis.React = React;
    cookiesMock.mockReset();
    redirectMock.mockClear();
    getEnvMock.mockReset();
    getEnvMock.mockReturnValue({
      appSessionSecret: "12345678901234567890123456789012",
    });
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
  }, 15_000);

  it("redirects forged or invalid session cookies to /login", async () => {
    cookiesMock.mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "forged-token" }),
    });

    const { default: HomePage } = await import("@/app/page");

    await expect(
      Promise.resolve().then(() => HomePage()),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  }, 15_000);
});
