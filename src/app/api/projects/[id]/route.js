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
import { upsertProjectCache, getCachedProjectData, invalidateProjectCache } from "@/lib/db";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function GET(request, { params }) {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accessToken, accountId } = session;
  const projectId = params.id;

  try {
    // Serve from cache if fresh
    const cached = await getCachedProjectData(accountId, projectId).catch(() => null);
    if (cached) {
      const age = Date.now() - new Date(cached.synced_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({
          ...cached.data,
          currentUserId: session.identity?.id ?? null,
        });
      }
    }

    const [project, people] = await Promise.all([
      getProject(accessToken, accountId, projectId),
      getPeople(accessToken, accountId, projectId).catch(() => []),
    ]);

    // Parse dock IDs
    const chatDock = project.dock?.find((d) => d.name === "chat" && d.enabled);
    const chatId = chatDock?.url?.match(/chats\/(\d+)/)?.[1] || chatDock?.id || null;

    const todoDock = project.dock?.find((d) => d.name === "todoset" && d.enabled);
    const todosetId = todoDock?.url?.match(/todosets\/(\d+)/)?.[1] || todoDock?.id || null;

    // Fetch campfire and todos in parallel
    const [campfireResult, todoResult] = await Promise.all([
      chatId
        ? Promise.all([
            getCampfire(accessToken, accountId, projectId, chatId),
            getCampfireLines(accessToken, accountId, projectId, chatId),
          ]).catch((err) => {
            console.error("Failed to fetch campfire:", err?.response?.data || err.message);
            return null;
          })
        : null,
      todosetId
        ? getTodoLists(accessToken, accountId, projectId, todosetId)
            .then((lists) =>
              Promise.all(
                lists.map(async (list) => {
                  const todos = await getTodos(accessToken, accountId, projectId, list.id).catch(() => []);
                  return { ...list, todos };
                })
              )
            )
            .catch((err) => {
              console.error("Failed to fetch todos:", err?.response?.data || err.message);
              return [];
            })
        : [],
    ]);

    const campfire = campfireResult?.[0] || null;
    const campfireLines = campfireResult ? [...campfireResult[1]].reverse() : [];
    const todoLists = todoResult || [];

    const data = { ...project, people, campfire, campfireLines, chatId, todoLists };

    await upsertProjectCache(accountId, projectId, data).catch((e) =>
      console.error("Failed to cache project data:", e.message)
    );

    return NextResponse.json({ ...data, currentUserId: session.identity?.id ?? null });
  } catch (error) {
    console.error("Failed to fetch project:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (error?.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers?.["retry-after"] || "10", 10);
      return NextResponse.json(
        { error: "API rate limit exceeded", retryAfter },
        { status: 429 }
      );
    }
    // Fall back to stale cache
    const stale = await getCachedProjectData(accountId, projectId).catch(() => null);
    if (stale) {
      return NextResponse.json({ ...stale.data, currentUserId: session.identity?.id ?? null });
    }
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
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

    // Invalidate cache so next GET fetches fresh messages
    await invalidateProjectCache(session.accountId, params.id).catch(() => {});

    return NextResponse.json(line);
  } catch (error) {
    console.error("Failed to send message:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
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
      return NextResponse.json({ error: "recordingId is required" }, { status: 400 });
    }

    await trashRecording(session.accessToken, session.accountId, params.id, recordingId);

    // Invalidate cache so deleted message doesn't show on next load
    await invalidateProjectCache(session.accountId, params.id).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete message:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
