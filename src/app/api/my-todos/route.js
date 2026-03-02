import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMyAssignments } from "@/lib/basecamp";
import { upsertTodos, getCachedTodos } from "@/lib/db";

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

function normalizeAssignable(a) {
  return {
    id: a.id,
    title: stripHtml(a.title) || "Untitled",
    completed: !!a.completed,
    due_on: a.due_on || null,
    created_at: a.created_at,
    type: a.type,
    listName: a.parent?.title || null,
    projectId: a.bucket?.id || null,
    projectName: a.bucket?.name || null,
    appUrl: a.app_url || null,
  };
}

function groupTodosByBucket(todos) {
  const map = new Map();
  for (const t of todos) {
    const key = String(t.projectId ?? "unknown");
    if (!map.has(key)) {
      map.set(key, { key, label: t.projectName || "Unknown Project", projectId: t.projectId, todos: [] });
    }
    map.get(key).todos.push(t);
  }
  return Array.from(map.values());
}

function groupTodosByDate(todos) {
  const map = new Map();
  for (const t of todos) {
    const key = t.due_on || "no-date";
    if (!map.has(key)) {
      map.set(key, { key, date: t.due_on || null, todos: [] });
    }
    map.get(key).todos.push(t);
  }
  return Array.from(map.values());
}

export async function GET(request) {
  const session = getSession();
  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = session.accountId;
  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get("group_by") === "date" ? "date" : "bucket";

  try {
    const raw = await getMyAssignments(session.accessToken, accountId, groupBy);

    let allTodos = [];
    let groups;

    if (groupBy === "bucket") {
      groups = (raw || []).map((g) => ({
        key: String(g.bucket?.id),
        label: g.bucket?.name || "Unknown Project",
        projectId: g.bucket?.id,
        todos: (g.assignments || []).map(normalizeAssignable),
      }));
      allTodos = groups.flatMap((g) => g.todos);
    } else {
      groups = (raw || []).map((g) => ({
        key: g.date || "no-date",
        date: g.date || null,
        todos: (g.assignments || []).map(normalizeAssignable),
      }));
      allTodos = groups.flatMap((g) => g.todos);
    }

    // Cache to Neon in the background
    upsertTodos(allTodos, accountId).catch((err) =>
      console.error("Neon todos upsert failed:", err.message)
    );

    return NextResponse.json({ groupBy, groups });
  } catch (error) {
    console.error("Failed to fetch assignments:", error?.response?.data || error.message);

    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    // Fall back to Neon cache
    try {
      const cached = await getCachedTodos(accountId);
      if (cached.length > 0) {
        console.log("Serving todos from Neon cache");
        const todos = cached.map((t) => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
          due_on: t.due_on,
          created_at: t.created_at,
          type: t.type,
          listName: t.list_name,
          projectId: t.project_id,
          projectName: t.project_name,
          appUrl: t.app_url,
        }));
        const groups = groupBy === "date" ? groupTodosByDate(todos) : groupTodosByBucket(todos);
        return NextResponse.json({ groupBy, groups });
      }
    } catch (dbErr) {
      console.error("Neon fallback failed:", dbErr.message);
    }

    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}
