import { cookies } from "next/headers";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";

export class DashboardAuthError extends Error {
  constructor() {
    super("Dashboard session required");
    this.name = "DashboardAuthError";
  }
}

export async function requireDashboardSession() {
  const env = getEnv();
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = await getSessionFromToken(token, env.appSessionSecret);

  if (!session) {
    throw new DashboardAuthError();
  }

  return session;
}

export function isDashboardAuthError(error: unknown): error is DashboardAuthError {
  return error instanceof DashboardAuthError;
}
