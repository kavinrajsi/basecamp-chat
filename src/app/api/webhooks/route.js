import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWebhookEvents } from "@/lib/db";

export async function GET() {
  const session = await getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await getWebhookEvents(200);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch webhook events:", error.message);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
