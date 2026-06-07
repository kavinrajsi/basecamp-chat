import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-logger";
import { getSession, isAdmin } from "@/lib/auth";

export const GET = withApiLogging("auth/me:GET", authMeGet);
async function authMeGet() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ identity: session.identity, isAdmin: isAdmin(session) });
}
