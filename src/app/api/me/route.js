import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-logger";
import { getSession } from "@/lib/auth";

export const GET = withApiLogging("me:GET", meGet);
async function meGet() {
  const session = await getSession();
  if (!session?.identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ id: session.identity.id, name: session.identity.name });
}
