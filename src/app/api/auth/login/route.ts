import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";

export async function POST(request: Request) {
  const env = getEnv();
  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || password !== env.appPassword) {
    return NextResponse.json(
      { ok: false, error: "Invalid password" },
      { status: 401 },
    );
  }

  const token = await createSessionToken(env.appSessionSecret);
  const cookieStore = cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}
