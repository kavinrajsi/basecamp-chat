import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProject, getPeople, getCampfire, getCampfireLines } from "@/lib/basecamp";

export async function GET(request, { params }) {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [project, people] = await Promise.all([
      getProject(session.accessToken, session.accountId, params.id),
      getPeople(session.accessToken, session.accountId, params.id).catch(
        () => []
      ),
    ]);

    // Find the Campfire (chat) dock item and fetch its data
    let campfire = null;
    let campfireLines = [];
    const chatDock = project.dock?.find(
      (d) => d.name === "chat" && d.enabled
    );

    if (chatDock) {
      // Extract chat ID from the dock URL
      const chatIdMatch = chatDock.url?.match(/chats\/(\d+)/);
      const chatId = chatIdMatch?.[1] || chatDock.id;

      if (chatId) {
        try {
          const [chat, lines] = await Promise.all([
            getCampfire(session.accessToken, session.accountId, params.id, chatId),
            getCampfireLines(session.accessToken, session.accountId, params.id, chatId),
          ]);
          campfire = chat;
          campfireLines = lines;
        } catch (err) {
          console.error("Failed to fetch campfire:", err?.response?.data || err.message);
        }
      }
    }

    return NextResponse.json({
      ...project,
      people,
      campfire,
      campfireLines,
    });
  } catch (error) {
    console.error("Failed to fetch project:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}
