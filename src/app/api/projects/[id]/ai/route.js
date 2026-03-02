import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

export async function POST(request, { params }) {
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

  const { action, projectData, chatHistory = [] } = body;
  if (!action || !projectData) {
    return NextResponse.json({ error: "Missing action or projectData" }, { status: 400 });
  }

  const { name = "Unknown Project", campfireLines = [], todoLists = [], people = [] } = projectData;

  const messagesText =
    campfireLines
      .map((m) => `${m.creator?.name || "Unknown"}: ${stripHtml(m.content)}`)
      .filter((line) => line.trim())
      .join("\n") || "No messages yet.";

  const todosText =
    todoLists
      .map((list) => {
        const items = (list.todos || [])
          .map(
            (t) =>
              `  [${t.completed ? "x" : " "}] ${stripHtml(t.content) || t.title || "Untitled"}${t.due_on ? ` (due: ${t.due_on})` : ""}`
          )
          .join("\n");
        return `${list.title || list.name}:\n${items || "  (empty)"}`;
      })
      .join("\n\n") || "No todos.";

  const teamText =
    people
      .map((p) => p.name)
      .filter(Boolean)
      .join(", ") || "No team members listed.";

  let systemPrompt, messages;

  switch (action) {
    case "summarize":
      systemPrompt =
        "You are a helpful assistant that summarizes project chat conversations clearly and concisely. Use bullet points and be specific about key topics, decisions, and action items.";
      messages = [
        {
          role: "user",
          content: `Summarize the recent conversations from project "${name}". Highlight:\n- Key topics discussed\n- Decisions made\n- Action items or next steps\n\nChat messages:\n${messagesText}`,
        },
      ];
      break;

    case "analyze":
      systemPrompt =
        "You are a project health analyst. Provide structured, actionable insights using clear formatting with emojis for visual clarity.";
      messages = [
        {
          role: "user",
          content: `Analyze the health of project "${name}".\n\nTeam (${people.length} members): ${teamText}\n\nTodo lists:\n${todosText}\n\nRecent messages (last 20):\n${campfireLines
            .slice(-20)
            .map((m) => `${m.creator?.name || "Unknown"}: ${stripHtml(m.content)}`)
            .join("\n") || "No messages."}\n\nProvide:\n1. Health Score (1-10) with justification\n2. Key Strengths\n3. Risks or Blockers\n4. Top 3 Recommendations`,
        },
      ];
      break;

    case "sentiment":
      systemPrompt =
        "You are a team dynamics and sentiment analyst. Provide empathetic, constructive insights about team communication and morale.";
      messages = [
        {
          role: "user",
          content: `Analyze the team sentiment for project "${name}".\n\nMessages:\n${messagesText}\n\nProvide:\n1. Overall Sentiment (Positive/Neutral/Negative) with a score\n2. Team Morale Assessment\n3. Communication Patterns observed\n4. Suggestions to Improve Team Dynamics`,
        },
      ];
      break;

    case "chat":
      systemPrompt = `You are a knowledgeable AI assistant for the project "${name}". You have full context of the project and answer questions clearly and helpfully.\n\nProject context:\nTeam: ${teamText}\n\nTodo lists:\n${todosText}\n\nRecent chat messages:\n${messagesText}`;
      messages =
        chatHistory.length > 0
          ? chatHistory
          : [{ role: "user", content: "Tell me about this project." }];
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
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
