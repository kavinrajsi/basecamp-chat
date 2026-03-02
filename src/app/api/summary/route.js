import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProjects,
  getProject,
  getCampfireLines,
  getTodoLists,
  getTodos,
} from "@/lib/basecamp";

export async function GET() {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accessToken, accountId } = session;

  try {
    const projects = await getProjects(accessToken, accountId);
    const activeProjects = projects.filter((p) => p.status === "active");

    const projectResults = await Promise.all(
      activeProjects.map(async (proj) => {
        try {
          const fullProject = await getProject(accessToken, accountId, proj.id);

          // Fetch todos
          let allTodos = [];
          const todoDock = fullProject.dock?.find(
            (d) => d.name === "todoset" && d.enabled
          );
          if (todoDock) {
            const todosetIdMatch = todoDock.url?.match(/todosets\/(\d+)/);
            const todosetId = todosetIdMatch?.[1] || todoDock.id;
            if (todosetId) {
              try {
                const lists = await getTodoLists(accessToken, accountId, proj.id, todosetId);
                const listsWithTodos = await Promise.all(
                  lists.map(async (list) => {
                    const todos = await getTodos(accessToken, accountId, proj.id, list.id).catch(() => []);
                    return { listName: list.title || list.name, todos };
                  })
                );
                allTodos = listsWithTodos.flatMap((l) =>
                  l.todos.map((t) => ({
                    ...t,
                    projectId: proj.id,
                    projectName: proj.name,
                    listName: l.listName,
                  }))
                );
              } catch {
                // skip todos for this project
              }
            }
          }

          // Fetch recent chat messages
          let recentMessages = [];
          const chatDock = fullProject.dock?.find(
            (d) => d.name === "chat" && d.enabled
          );
          if (chatDock) {
            const chatIdMatch = chatDock.url?.match(/chats\/(\d+)/);
            const chatId = chatIdMatch?.[1] || chatDock.id;
            if (chatId) {
              try {
                const lines = await getCampfireLines(accessToken, accountId, proj.id, chatId);
                recentMessages = lines.map((line) => ({
                  ...line,
                  projectId: proj.id,
                  projectName: proj.name,
                }));
              } catch {
                // skip chat for this project
              }
            }
          }

          return {
            id: proj.id,
            name: proj.name,
            status: proj.status,
            updated_at: proj.updated_at,
            todos: allTodos,
            recentMessages,
          };
        } catch {
          return {
            id: proj.id,
            name: proj.name,
            status: proj.status,
            updated_at: proj.updated_at,
            todos: [],
            recentMessages: [],
          };
        }
      })
    );

    // Aggregate all todos and messages
    const allTodos = projectResults.flatMap((p) => p.todos);
    const allMessages = projectResults
      .flatMap((p) => p.recentMessages)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Project overview stats
    const projectOverview = projectResults.map((p) => {
      const incompleteTodos = p.todos.filter((t) => !t.completed);
      const today = new Date().toISOString().split("T")[0];
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        updated_at: p.updated_at,
        totalTodos: p.todos.length,
        completedTodos: p.todos.filter((t) => t.completed).length,
        overdueTodos: incompleteTodos.filter(
          (t) => t.due_on && t.due_on < today
        ).length,
        dueTodayTodos: incompleteTodos.filter((t) => t.due_on === today).length,
        recentMessageCount: p.recentMessages.length,
      };
    });

    return NextResponse.json({
      todos: allTodos,
      recentMessages: allMessages,
      projects: projectOverview,
      identity: session.identity,
    });
  } catch (error) {
    console.error("Failed to fetch summary:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
