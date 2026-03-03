import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getWebhookEvents } from "@/lib/db";

export async function GET() {
  const session = await getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const events = await getWebhookEvents(200);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch webhook events:", error.message);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
