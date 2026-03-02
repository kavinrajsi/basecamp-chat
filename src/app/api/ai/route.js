import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import {
  getProjects,
  getProject,
  getCampfireLines,
  getTodoLists,
  getTodos,
  getMessages,
  getScheduleEntries,
} from "@/lib/basecamp";

const client = new Anthropic();

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function gatherContext(session) {
  const { accessToken, accountId, identity } = session;

  const projects = await getProjects(accessToken, accountId);
  const activeProjects = projects.filter((p) => p.status === "active");

  const projectContexts = await Promise.all(
    activeProjects.map(async (project) => {
      const fullProject = await getProject(accessToken, accountId, project.id).catch(() => null);
      if (!fullProject) return { name: project.name, id: project.id };

      const dock = fullProject.dock || [];

      // Todos
      let todos = [];
      const todoDock = dock.find((d) => d.name === "todoset" && d.enabled);
      if (todoDock) {
        const todosetId = todoDock.url?.match(/todosets\/(\d+)/)?.[1] || todoDock.id;
        if (todosetId) {
          const lists = await getTodoLists(accessToken, accountId, project.id, todosetId).catch(() => []);
          todos = (
            await Promise.all(
              lists.map((list) =>
                getTodos(accessToken, accountId, project.id, list.id)
                  .then((ts) => ts.map((t) => ({ ...t, listName: list.name })))
                  .catch(() => [])
              )
            )
          ).flat();
        }
      }

      // Campfire (recent 15 messages)
      let campfireLines = [];
      const campfireDock = dock.find((d) => d.name === "chat" && d.enabled);
      if (campfireDock) {
        const chatId = campfireDock.url?.match(/chats\/(\d+)/)?.[1] || campfireDock.id;
        if (chatId) {
          campfireLines = await getCampfireLines(accessToken, accountId, project.id, chatId)
            .then((lines) => lines.slice(-15))
            .catch(() => []);
        }
      }

      // Message board (recent 10 posts)
      let messages = [];
      const msgDock = dock.find((d) => d.name === "message_board" && d.enabled);
      if (msgDock) {
        const mbId = msgDock.url?.match(/message_boards\/(\d+)/)?.[1] || msgDock.id;
        if (mbId) {
          messages = await getMessages(accessToken, accountId, project.id, mbId)
            .then((msgs) => msgs.slice(0, 10))
            .catch(() => []);
        }
      }

      // Schedule entries (upcoming 10)
      let scheduleEntries = [];
      const scheduleDock = dock.find((d) => d.name === "schedule" && d.enabled);
      if (scheduleDock) {
        const schedId = scheduleDock.url?.match(/schedules\/(\d+)/)?.[1] || scheduleDock.id;
        if (schedId) {
          scheduleEntries = await getScheduleEntries(accessToken, accountId, project.id, schedId)
            .then((entries) => entries.slice(0, 10))
            .catch(() => []);
        }
      }

      return { project, todos, campfireLines, messages, scheduleEntries };
    })
  );

  return { identity, projectContexts };
}

function buildContextText({ identity, projectContexts }) {
  const myId = identity?.id;
  const myName = [identity?.first_name, identity?.last_name].filter(Boolean).join(" ");
  const today = new Date().toDateString();

  const sections = projectContexts.map(({ project, todos = [], campfireLines = [], messages = [], scheduleEntries = [] }) => {
    const open = todos.filter((t) => !t.completed);
    const done = todos.filter((t) => t.completed);
    const myOpen = open.filter((t) => t.assignees?.some((a) => a.id === myId));
    const overdue = myOpen.filter((t) => t.due_on && new Date(t.due_on) < new Date(today));

    const todoText = open.length === 0 && done.length === 0
      ? "  No todos."
      : [
          `  Open todos (${open.length}):`,
          ...open.slice(0, 20).map((t) => {
            const assignees = t.assignees?.map((a) => a.name).join(", ") || "Unassigned";
            const due = t.due_on ? ` [due: ${t.due_on}]` : "";
            const me = t.assignees?.some((a) => a.id === myId) ? " [MINE]" : "";
            return `    - ${stripHtml(t.content) || "Untitled"}${due}${me} — ${assignees} (${t.listName || "—"})`;
          }),
          done.length > 0 ? `  Recently completed todos (${done.length}):` : "",
          ...done.slice(0, 10).map((t) => {
            const assignees = t.assignees?.map((a) => a.name).join(", ") || "Unassigned";
            return `    ✓ ${stripHtml(t.content) || "Untitled"} — ${assignees}`;
          }),
        ].filter(Boolean).join("\n");

    const chatText = campfireLines.length === 0
      ? "  No recent messages."
      : campfireLines.map((m) => `  ${m.creator?.name || "?"}: ${stripHtml(m.content)}`).join("\n");

    const msgText = messages.length === 0
      ? "  No message board posts."
      : messages.map((m) => `  [${formatDate(m.created_at)}] ${m.creator?.name || "?"}: ${m.subject} — ${stripHtml(m.content).slice(0, 200)}`).join("\n");

    const schedText = scheduleEntries.length === 0
      ? "  No upcoming events."
      : scheduleEntries.map((e) => `  ${e.summary} — ${formatDate(e.starts_at)} to ${formatDate(e.ends_at)}`).join("\n");

    return `## Project: ${project.name} (status: ${project.status})
${project.description ? `Description: ${project.description}` : ""}

### To-dos
${todoText}

### Recent Campfire Chat
${chatText}

### Message Board (recent posts)
${msgText}

### Schedule (upcoming events)
${schedText}`;
  });

  return `# Basecamp Context (Today: ${today})
Current user: ${myName} (ID: ${myId})

${sections.join("\n\n---\n\n")}`;
}

export async function POST(request) {
  const session = getSession();
  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message, chatHistory = [] } = body;
  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  try {
    const context = await gatherContext(session);
    const contextText = buildContextText(context);

    const systemPrompt = `You are a helpful AI assistant with full access to the user's Basecamp data. Use the context below to answer questions accurately and helpfully. When listing todos or events, be specific. Format responses with markdown for clarity.

What you have access to:
- Projects and their status
- To-dos (open and completed), assignees, due dates, list names
- Recent Campfire chat messages
- Message board posts and subjects
- Schedule/calendar events
- You know which todos are assigned to the current user (marked [MINE])

What you do NOT have access to:
- File contents or binary attachments
- External links or embedded media
- Items outside the user's permission scope

${contextText}`;

    const messages =
      chatHistory.length > 0
        ? [...chatHistory, { role: "user", content: message }]
        : [{ role: "user", content: message }];

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("AI error:", error?.message || error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
