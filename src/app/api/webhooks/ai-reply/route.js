import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractAndStoreLeave } from "@/lib/leave-ai";

export async function POST(request) {
  const session = await getSession();
  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { recording, creator } = body;
  if (!recording) {
    return NextResponse.json({ error: "Missing recording" }, { status: 400 });
  }

  try {
    const result = await extractAndStoreLeave(recording, creator);

    return new Response(result || "No content found.", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Leave date error:", error?.message || error);
    return NextResponse.json({ error: "Failed to fetch leave date" }, { status: 500 });
  }
}
