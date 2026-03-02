import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMyAssignments } from "@/lib/basecamp";

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

export async function GET(request) {
  const session = getSession();
  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get("group_by") === "date" ? "date" : "bucket";

  try {
    const raw = await getMyAssignments(session.accessToken, session.accountId, groupBy);

    if (groupBy === "bucket") {
      const groups = (raw || []).map((g) => ({
        key: String(g.bucket?.id),
        label: g.bucket?.name || "Unknown Project",
        projectId: g.bucket?.id,
        todos: (g.assignables || []).map(normalizeAssignable),
      }));
      return NextResponse.json({ groupBy, groups });
    }

    // group_by=date
    const groups = (raw || []).map((g) => ({
      key: g.date || "no-date",
      date: g.date || null,
      todos: (g.assignables || []).map(normalizeAssignable),
    }));
    return NextResponse.json({ groupBy, groups });
  } catch (error) {
    console.error("Failed to fetch assignments:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}
