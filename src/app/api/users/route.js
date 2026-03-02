import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProjects,
  getProject,
  getPeople,
  getTodoLists,
  getTodos,
} from "@/lib/basecamp";

export async function GET() {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await getProjects(session.accessToken, session.accountId);
    const activeProjects = projects.filter((p) => p.status === "active");

    // Fetch people + todos for all projects in parallel
    const projectData = await Promise.all(
      activeProjects.map(async (project) => {
        const [people, fullProject] = await Promise.all([
          getPeople(session.accessToken, session.accountId, project.id).catch(() => []),
          getProject(session.accessToken, session.accountId, project.id).catch(() => null),
        ]);

        let todos = [];
        if (fullProject) {
          const todoDock = fullProject.dock?.find(
            (d) => d.name === "todoset" && d.enabled
          );
          if (todoDock) {
            const todosetId =
              todoDock.url?.match(/todosets\/(\d+)/)?.[1] || todoDock.id;
            if (todosetId) {
              const lists = await getTodoLists(
                session.accessToken,
                session.accountId,
                project.id,
                todosetId
              ).catch(() => []);

              todos = (
                await Promise.all(
                  lists.map((list) =>
                    getTodos(
                      session.accessToken,
                      session.accountId,
                      project.id,
                      list.id
                    ).catch(() => [])
                  )
                )
              ).flat();
            }
          }
        }

        return { project, people, todos };
      })
    );

    // Aggregate per user across all projects
    const userMap = new Map();

    for (const { project, people, todos } of projectData) {
      for (const person of people) {
        if (!userMap.has(person.id)) {
          userMap.set(person.id, {
            id: person.id,
            name: person.name,
            email: person.email_address,
            avatar_url: person.avatar_url,
            title: person.title || "",
            total: 0,
            completed: 0,
            incomplete: 0,
            projects: [],
          });
        }
        const user = userMap.get(person.id);
        if (!user.projects.find((p) => p.id === project.id)) {
          user.projects.push({ id: project.id, name: project.name });
        }
      }

      for (const todo of todos) {
        for (const assignee of todo.assignees || []) {
          if (userMap.has(assignee.id)) {
            const user = userMap.get(assignee.id);
            user.total++;
            if (todo.completed) user.completed++;
            else user.incomplete++;
          }
        }
      }
    }

    const users = Array.from(userMap.values()).sort((a, b) => b.total - a.total);
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
