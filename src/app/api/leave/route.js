import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLeaveEntries } from "@/lib/db";

export async function GET() {
  const session = await getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await getLeaveEntries(200);

    const answers = rows.map((row) => ({
      id: row.id,
      recording_id: row.recording_id,
      content: row.raw_content,
      ai_response: row.ai_response,
      created_at: row.created_at,
      updated_at: row.updated_at,
      creator: {
        name: row.creator_name,
        avatar_url: row.creator_avatar,
        email: row.creator_email,
      },
    }));

    return NextResponse.json({ answers });
  } catch (error) {
    console.error("Failed to fetch leave data:", error.message);
    return NextResponse.json({ error: "Failed to fetch leave data" }, { status: 500 });
  }
}
