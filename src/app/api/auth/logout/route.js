import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function GET(request) {
  clearSession();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/", origin));
}

export async function POST() {
  clearSession();
  return NextResponse.json({ ok: true });
}
