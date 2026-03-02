"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ChevronDown, ChevronUp, Bot, User, Loader2, RotateCcw } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const SUGGESTED_PROMPTS = [
  {
    label: "Completed to-dos",
    prompt: "Summarize all recently completed to-dos across my projects.",
  },
  {
    label: "My overdue tasks",
    prompt: "List all overdue to-dos assigned to me.",
  },
  {
    label: "Draft status update",
    prompt:
      "Draft a concise status update based on recent message board activity and completed to-dos across all projects.",
  },
  {
    label: "This week's events",
    prompt: "What events and deadlines are coming up across my projects this week?",
  },
  {
    label: "Project health",
    prompt: "Which projects have the most open to-dos? Give me a quick health overview.",
  },
  {
    label: "Team workload",
    prompt: "Who has the most open to-dos assigned to them across all projects?",
  },
];

const CAPABILITIES = [
  { label: "Projects and message boards", icon: "✅" },
  { label: "To-dos and to-do lists", icon: "✅" },
  { label: "Messages and comments", icon: "✅" },
  { label: "Campfire chat (recent)", icon: "✅" },
  { label: "Schedule / calendar events", icon: "✅" },
  { label: "Large binary attachments (videos, embedded media)", icon: "🚫" },
  { label: "Items outside your permission scope", icon: "🚫" },
];

function MessageBubble({ role, content, loading }) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-600" : "bg-purple-700"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-gray-800 text-gray-100 rounded-tl-sm"
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </span>
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiPage() {
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  async function send(message) {
    if (!message.trim() || streaming) return;

    const userMsg = { role: "user", content: message.trim() };
    const assistantMsg = { role: "assistant", content: "", loading: true };

    setChatHistory((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    // Build history without the loading assistant message
    const historyForApi = [...chatHistory, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          chatHistory: chatHistory.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (res.status === 401) {
        window.location.href = "/";
        return;
      }

      if (!res.ok || !res.body) {
        setChatHistory((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: "Sorry, something went wrong. Please try again.", loading: false }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const snapshot = text;
        setChatHistory((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: snapshot, loading: false } : m
          )
        );
      }
    } catch {
      setChatHistory((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: "Network error. Please try again.", loading: false }
            : m
        )
      );
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  function handleSuggestion(prompt) {
    send(prompt);
  }

  function clearChat() {
    setChatHistory([]);
    setInput("");
    inputRef.current?.focus();
  }

  const isEmpty = chatHistory.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Header />
      <BottomNav />
      <main className="flex flex-1 flex-col mx-auto w-full max-w-2xl px-0 sm:px-4">
        {/* Page title */}
        <div className="px-4 pt-5 pb-3 sm:px-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h1 className="text-xl font-bold text-gray-100">Basecamp AI</h1>
            </div>
            {!isEmpty && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                New chat
              </button>
            )}
          </div>

          {/* Capabilities toggle */}
          <button
            onClick={() => setShowCapabilities((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showCapabilities ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            What it can access
          </button>
          {showCapabilities && (
            <div className="mt-2 rounded-xl bg-gray-900 border border-gray-700/50 px-4 py-3 text-xs space-y-1.5">
              {CAPABILITIES.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-gray-400">
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-0">
          {isEmpty ? (
            /* Welcome / suggestions */
            <div className="flex flex-col items-center justify-center pt-10 pb-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-900/40 mb-4">
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-100 mb-1">
                Ask anything about your projects
              </h2>
              <p className="text-sm text-gray-400 mb-8 max-w-sm">
                I have access to your todos, messages, schedule, and more across all active projects.
              </p>

              {/* Suggested prompts */}
              <div className="grid grid-cols-1 gap-2 w-full sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSuggestion(s.prompt)}
                    disabled={streaming}
                    className="rounded-xl border border-gray-700/60 bg-gray-900 px-4 py-3 text-left text-sm hover:bg-gray-800 hover:border-gray-600 transition-colors disabled:opacity-50"
                  >
                    <span className="block font-medium text-gray-200">{s.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {s.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              {chatHistory.map((msg, i) => (
                <MessageBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  loading={msg.loading}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="sticky bottom-16 bg-gray-950 px-4 py-4 sm:px-0 sm:bottom-0">
          {!isEmpty && (
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.slice(0, 3).map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.prompt)}
                  disabled={streaming}
                  className="rounded-full border border-gray-700/60 bg-gray-900 px-3 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors disabled:opacity-40"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your projects, todos, messages…"
              disabled={streaming}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {streaming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
