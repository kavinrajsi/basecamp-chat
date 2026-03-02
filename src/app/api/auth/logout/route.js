import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function GET(request) {
  clearSession();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/", origin));
}

export async function POST() {
  clearSession();
  return NextResponse.json({ ok: true });
}
