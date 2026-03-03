import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ identity: session.identity, isAdmin: isAdmin(session) });
}
