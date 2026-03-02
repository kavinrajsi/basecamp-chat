import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjects, getProject, getTodoLists, getTodos } from "@/lib/basecamp";
import { upsertTodoCache, getCachedTodoData } from "@/lib/db";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function withRetry(fn, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.response?.status === 429 && attempt < retries - 1) {
        const wait = parseInt(err.response.headers?.["retry-after"] || "8", 10);
        await sleep(wait * 1000);
      } else {
        throw err;
      }
    }
  }
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

export async function GET() {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accessToken, accountId } = session;

  try {
    // Serve from cache if fresh
    const cached = await getCachedTodoData(accountId).catch(() => null);
    if (cached) {
      const age = Date.now() - new Date(cached.synced_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json(cached.data);
      }
    }

    const projects = await withRetry(() => getProjects(accessToken, accountId));
    const activeProjects = projects.filter((p) => p.status === "active");

    const projectTasks = activeProjects.map((project) => async () => {
      const fullProject = await withRetry(() =>
        getProject(accessToken, accountId, project.id)
      ).catch(() => null);

      if (!fullProject) return null;

      const todoDock = fullProject.dock?.find(
        (d) => d.name === "todoset" && d.enabled
      );
      if (!todoDock) return null;

      const todosetId =
        todoDock.url?.match(/todosets\/(\d+)/)?.[1] || todoDock.id;
      if (!todosetId) return null;

      const lists = await withRetry(() =>
        getTodoLists(accessToken, accountId, project.id, todosetId)
      ).catch(() => []);

      const listTasks = lists.map((list) => async () => {
        const [incomplete, completed] = await Promise.all([
          withRetry(() => getTodos(accessToken, accountId, project.id, list.id, false)).catch(() => []),
          withRetry(() => getTodos(accessToken, accountId, project.id, list.id, true)).catch(() => []),
        ]);
        return {
          id: list.id,
          name: list.name,
          description: list.description || "",
          todos: [
            ...incomplete.map((t) => ({
              id: t.id,
              title: t.title,
              completed: false,
              due_on: t.due_on || null,
              assignees: (t.assignees || []).map((a) => ({
                id: a.id,
                name: a.name,
                avatar_url: a.avatar_url,
              })),
            })),
            ...completed.map((t) => ({
              id: t.id,
              title: t.title,
              completed: true,
              due_on: t.due_on || null,
              assignees: (t.assignees || []).map((a) => ({
                id: a.id,
                name: a.name,
                avatar_url: a.avatar_url,
              })),
            })),
          ],
        };
      });

      const todoLists = await runWithConcurrency(listTasks, 3);

      return {
        id: project.id,
        name: project.name,
        lists: todoLists,
      };
    });

    const results = await runWithConcurrency(projectTasks, 3);
    const data = results.filter(Boolean);

    await upsertTodoCache(accountId, data).catch((e) =>
      console.error("Failed to cache todo data:", e.message)
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch todo lists:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    // Fall back to stale cache rather than returning an error
    const stale = await getCachedTodoData(accountId).catch(() => null);
    if (stale) return NextResponse.json(stale.data);
    return NextResponse.json({ error: "Failed to fetch todo lists" }, { status: 500 });
  }
}
