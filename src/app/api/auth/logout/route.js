import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-logger";
import { clearSession } from "@/lib/auth";

export const GET = withApiLogging("auth/logout:GET", logoutGet);
async function logoutGet(request) {
  await clearSession();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/", origin));
}

export const POST = withApiLogging("auth/logout:POST", logoutPost);
async function logoutPost() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
