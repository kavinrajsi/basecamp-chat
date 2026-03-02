import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProjects,
  getProject,
  getPeople,
  getTodoLists,
  getTodos,
} from "@/lib/basecamp";

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

  try {
    const projects = await withRetry(() =>
      getProjects(session.accessToken, session.accountId)
    );
    const activeProjects = projects.filter((p) => p.status === "active");

    // Fetch people + todos for projects with limited concurrency (3 at a time)
    const projectTasks = activeProjects.map((project) => async () => {
      const [people, fullProject] = await Promise.all([
        withRetry(() => getPeople(session.accessToken, session.accountId, project.id)).catch(() => []),
        withRetry(() => getProject(session.accessToken, session.accountId, project.id)).catch(() => null),
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
            const lists = await withRetry(() =>
              getTodoLists(session.accessToken, session.accountId, project.id, todosetId)
            ).catch(() => []);

            const todoTasks = lists.flatMap((list) => [
              () => withRetry(() => getTodos(session.accessToken, session.accountId, project.id, list.id, false)).catch(() => []),
              () => withRetry(() => getTodos(session.accessToken, session.accountId, project.id, list.id, true)).catch(() => []),
            ]);
            todos = (await runWithConcurrency(todoTasks, 3)).flat();
          }
        }
      }

      return { project, people, todos };
    });

    const projectData = await runWithConcurrency(projectTasks, 3);

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
            todos: [],
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
            user.todos.push({
              id: todo.id,
              title: todo.title,
              completed: todo.completed,
              due_on: todo.due_on || null,
              project: project.name,
            });
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
