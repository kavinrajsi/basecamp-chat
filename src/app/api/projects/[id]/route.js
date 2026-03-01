import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProject,
  getPeople,
  getCampfire,
  getCampfireLines,
  createCampfireLine,
  trashRecording,
  getTodoLists,
  getTodos,
} from "@/lib/basecamp";

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
    let chatId = null;
    const chatDock = project.dock?.find(
      (d) => d.name === "chat" && d.enabled
    );

    if (chatDock) {
      const chatIdMatch = chatDock.url?.match(/chats\/(\d+)/);
      chatId = chatIdMatch?.[1] || chatDock.id;

      if (chatId) {
        try {
          const [chat, lines] = await Promise.all([
            getCampfire(session.accessToken, session.accountId, params.id, chatId),
            getCampfireLines(session.accessToken, session.accountId, params.id, chatId),
          ]);
          campfire = chat;
          campfireLines = [...lines].reverse();
        } catch (err) {
          console.error("Failed to fetch campfire:", err?.response?.data || err.message);
        }
      }
    }

    // Find the Todoset dock item and fetch todos
    let todoLists = [];
    const todoDock = project.dock?.find(
      (d) => d.name === "todoset" && d.enabled
    );

    if (todoDock) {
      const todosetIdMatch = todoDock.url?.match(/todosets\/(\d+)/);
      const todosetId = todosetIdMatch?.[1] || todoDock.id;

      if (todosetId) {
        try {
          const lists = await getTodoLists(
            session.accessToken,
            session.accountId,
            params.id,
            todosetId
          );
          const listsWithTodos = await Promise.all(
            lists.map(async (list) => {
              const todos = await getTodos(
                session.accessToken,
                session.accountId,
                params.id,
                list.id
              ).catch(() => []);
              return { ...list, todos };
            })
          );
          todoLists = listsWithTodos;
        } catch (err) {
          console.error("Failed to fetch todos:", err?.response?.data || err.message);
        }
      }
    }

    return NextResponse.json({
      ...project,
      people,
      campfire,
      campfireLines,
      chatId,
      todoLists,
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

export async function POST(request, { params }) {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { chatId, content } = await request.json();

    if (!chatId || !content?.trim()) {
      return NextResponse.json(
        { error: "chatId and content are required" },
        { status: 400 }
      );
    }

    const line = await createCampfireLine(
      session.accessToken,
      session.accountId,
      params.id,
      chatId,
      content
    );

    return NextResponse.json(line);
  } catch (error) {
    console.error("Failed to send message:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recordingId } = await request.json();

    if (!recordingId) {
      return NextResponse.json(
        { error: "recordingId is required" },
        { status: 400 }
      );
    }

    await trashRecording(
      session.accessToken,
      session.accountId,
      params.id,
      recordingId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete message:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
