import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/server/auth";

const cookieSetMock = vi.fn();
const cookiesMock = vi.fn();
const getEnvMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/server/env", () => ({
  getEnv: getEnvMock,
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    cookieSetMock.mockReset();
    cookiesMock.mockReset();
    getEnvMock.mockReset();
    cookiesMock.mockReturnValue({
      set: cookieSetMock,
    });
    getEnvMock.mockReturnValue({
      appPassword: "top-secret",
      appSessionSecret: "12345678901234567890123456789012",
    });
  });

  it("sets the dashboard session cookie after a valid login", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const formData = new FormData();

    formData.set("password", "top-secret");

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    expect(cookieSetMock).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 12,
      }),
    );
  });
});
