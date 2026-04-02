import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/server/auth";

const cookieSetMock = vi.fn();
const cookiesMock = vi.fn();
const getEnvMock = vi.fn();
const originalNodeEnv = process.env.NODE_ENV;

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
    process.env.NODE_ENV = "test";
    cookiesMock.mockReturnValue({
      set: cookieSetMock,
    });
    getEnvMock.mockReturnValue({
      appPassword: "top-secret",
      appSessionSecret: "12345678901234567890123456789012",
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
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

  it("rejects an invalid password without setting the session cookie", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const formData = new FormData();

    formData.set("password", "wrong-password");

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(401);
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("uses a non-secure cookie for plain HTTP requests in production", async () => {
    process.env.NODE_ENV = "production";

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
        secure: false,
      }),
    );
  });

  it("keeps the session cookie secure for HTTPS requests in production", async () => {
    process.env.NODE_ENV = "production";

    const { POST } = await import("@/app/api/auth/login/route");
    const formData = new FormData();

    formData.set("password", "top-secret");

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
        headers: {
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(cookieSetMock).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({
        secure: true,
      }),
    );
  });
});
