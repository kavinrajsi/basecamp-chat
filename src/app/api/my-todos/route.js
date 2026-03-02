import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjects, getProject, getTodoLists, getTodos } from "@/lib/basecamp";

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

export async function GET() {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myId = session.identity?.id;
  if (!myId) {
    return NextResponse.json({ error: "No identity in session" }, { status: 400 });
  }

  try {
    const projects = await getProjects(session.accessToken, session.accountId);
    const activeProjects = projects.filter((p) => p.status === "active");

    const results = await Promise.all(
      activeProjects.map(async (project) => {
        const fullProject = await getProject(
          session.accessToken,
          session.accountId,
          project.id
        ).catch(() => null);

        if (!fullProject) return null;

        const todoDock = fullProject.dock?.find(
          (d) => d.name === "todoset" && d.enabled
        );
        if (!todoDock) return null;

        const todosetId =
          todoDock.url?.match(/todosets\/(\d+)/)?.[1] || todoDock.id;
        if (!todosetId) return null;

        const lists = await getTodoLists(
          session.accessToken,
          session.accountId,
          project.id,
          todosetId
        ).catch(() => []);

        const allTodos = (
          await Promise.all(
            lists.map((list) =>
              getTodos(
                session.accessToken,
                session.accountId,
                project.id,
                list.id
              )
                .then((todos) => todos.map((t) => ({ ...t, listName: list.name })))
                .catch(() => [])
            )
          )
        ).flat();

        const myTodos = allTodos.filter((t) =>
          t.assignees?.some((a) => a.id === myId)
        );

        if (myTodos.length === 0) return null;

        return {
          projectId: project.id,
          projectName: project.name,
          todos: myTodos.map((t) => ({
            id: t.id,
            title: stripHtml(t.content) || t.title || "Untitled",
            completed: t.completed,
            due_on: t.due_on || null,
            created_at: t.created_at,
            listName: t.listName,
          })),
        };
      })
    );

    const groups = results.filter(Boolean);
    return NextResponse.json({ identity: session.identity, groups });
  } catch (error) {
    console.error("Failed to fetch my todos:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}
