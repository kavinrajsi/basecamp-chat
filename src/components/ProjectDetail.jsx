"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { format, isEqual, startOfDay, differenceInDays, addDays, subDays } from "date-fns";
import { Calendar, Users, ArrowLeft, ExternalLink, MessageCircle, Send, FileText, Download, ListTodo, CheckSquare, Square, ChevronDown, ChevronRight, BarChart3, WifiOff, Sparkles, AlignLeft, TrendingUp, Bot, Smile } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import MentionDropdown from "./MentionDropdown";
import MessageMenu from "./MessageMenu";

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ProjectDetail({ project, onMessageSent }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(null);
  const [expandedLists, setExpandedLists] = useState({});
  const [mobileTab, setMobileTab] = useState("chat");
  const [todoView, setTodoView] = useState("list");
  const [isOffline, setIsOffline] = useState(false);
  const [aiMode, setAiMode] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const desktopInputRef = useRef(null);
  const aiChatEndRef = useRef(null);

  const people = project.people || [];
  const filteredPeople = people.filter((p) =>
    p.name?.toLowerCase().startsWith(mentionFilter.toLowerCase())
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project.campfireLines]);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiChatHistory]);

  useEffect(() => {
    function sync() {
      setIsOffline(!navigator.onLine || localStorage.getItem("offlineMode") === "true");
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("offlinemode", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("offlinemode", sync);
    };
  }, []);

  const detectMention = useCallback((value, cursorPos) => {
    const before = value.slice(0, cursorPos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx === -1) {
      setShowMentions(false);
      return;
    }
    if (atIdx > 0 && before[atIdx - 1] !== " ") {
      setShowMentions(false);
      return;
    }
    const partial = before.slice(atIdx + 1);
    if (partial.includes("  ")) {
      setShowMentions(false);
      return;
    }
    setMentionStart(atIdx);
    setMentionFilter(partial);
    setMentionIndex(0);
    const matches = people.filter((p) =>
      p.name?.toLowerCase().startsWith(partial.toLowerCase())
    );
    setShowMentions(matches.length > 0);
  }, [people]);

  function handleChange(e) {
    const val = e.target.value;
    setMessage(val);
    detectMention(val, e.target.selectionStart);
  }

  function handleSelect(person) {
    const before = message.slice(0, mentionStart);
    const after = message.slice(inputRef.current?.selectionStart ?? message.length);
    const newMsg = `${before}@${person.name} ${after}`;
    setMessage(newMsg);
    setShowMentions(false);
    setTimeout(() => {
      const pos = before.length + person.name.length + 2;
      inputRef.current?.setSelectionRange(pos, pos);
      inputRef.current?.focus();
    }, 0);
  }

  function handleKeyDown(e) {
    if (!showMentions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, filteredPeople.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filteredPeople.length > 0) {
        e.preventDefault();
        handleSelect(filteredPeople[mentionIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowMentions(false);
    }
  }

  function transformContent(text) {
    let result = text;
    for (const person of people) {
      const pattern = new RegExp(`@${person.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "g");
      result = result.replace(pattern, `<strong>@${person.name}</strong>`);
    }
    return result;
  }

  async function runAI(action) {
    setAiMode(action);
    setAiResult("");
    setAiLoading(true);

    const projectData = {
      name: project.name,
      campfireLines: (project.campfireLines || []).slice(-50),
      todoLists: project.todoLists || [],
      people: project.people || [],
    };

    try {
      const res = await fetch(`/api/projects/${project.id}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, projectData }),
      });
      if (!res.ok) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiResult((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setAiResult("Failed to get AI response. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function startAiChat() {
    setAiMode("chat");
    setAiResult("");
    setAiChatHistory([]);
  }

  async function sendAiChat(e) {
    e.preventDefault();
    const userText = aiChatInput.trim();
    if (!userText || aiLoading) return;

    const newHistory = [...aiChatHistory, { role: "user", content: userText }];
    setAiChatHistory([...newHistory, { role: "assistant", content: "" }]);
    setAiChatInput("");
    setAiLoading(true);

    const projectData = {
      name: project.name,
      campfireLines: (project.campfireLines || []).slice(-50),
      todoLists: project.todoLists || [],
      people: project.people || [],
    };

    try {
      const res = await fetch(`/api/projects/${project.id}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", projectData, chatHistory: newHistory }),
      });
      if (!res.ok) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setAiChatHistory((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      }
    } catch {
      setAiChatHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, I encountered an error. Please try again." };
        return updated;
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim() || !project.chatId || sending) return;

    setSending(true);
    try {
      const content = transformContent(message.trim());
      await axios.post(`/api/projects/${project.id}`, {
        chatId: project.chatId,
        content,
      });
      setMessage("");
      if (onMessageSent) onMessageSent();
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleMessageAction(action, line) {
    switch (action) {
      case "copy-link": {
        const url = line.app_url || `${window.location.href}#message-${line.id}`;
        await navigator.clipboard.writeText(url);
        break;
      }
      case "delete": {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
          await axios.delete(`/api/projects/${project.id}`, {
            data: { recordingId: line.id },
          });
          if (onMessageSent) onMessageSent();
        } catch (err) {
          console.error("Failed to delete:", err);
        }
        break;
      }
    }
  }

  const hasChat = project.campfireLines && project.campfireLines.length > 0;
  const hasEmptyChat = project.chatId && !hasChat;
  const hasTodos = project.todoLists && project.todoLists.length > 0;

  function toggleList(listId) {
    setExpandedLists((prev) => ({ ...prev, [listId]: !prev[listId] }));
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date() ;
  }

  const chatInput = project.chatId && (
    <div className="border-t border-gray-700 bg-gray-900 px-3 py-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:mt-4">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-md bg-gray-700/60 px-3 py-2 mb-2 text-sm text-gray-300">
          <WifiOff className="h-4 w-4 shrink-0 text-gray-400" />
          You&apos;re offline — sending is disabled
        </div>
      )}
      {/* Mobile: simple input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 sm:hidden">
        <div className="relative flex-1">
          {showMentions && (
            <MentionDropdown
              people={people}
              filter={mentionFilter}
              onSelect={handleSelect}
              selectedIndex={mentionIndex}
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Send message"
            disabled={sending || isOffline}
            className="w-full rounded-full border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || sending || isOffline}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      {/* Desktop: composer */}
      <form onSubmit={handleSend} className="hidden sm:block">
        <div className="relative rounded-lg border border-gray-600 bg-gray-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          {showMentions && (
            <MentionDropdown
              people={people}
              filter={mentionFilter}
              onSelect={handleSelect}
              selectedIndex={mentionIndex}
            />
          )}
          <textarea
            ref={desktopInputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={(e) => {
              handleKeyDown(e);
              if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Write your message..."
            disabled={sending || isOffline}
            rows={3}
            className="w-full resize-none rounded-lg bg-transparent px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="mt-2">
          <button
            type="submit"
            disabled={!message.trim() || sending || isOffline}
            className="rounded-full bg-green-200 px-5 py-1.5 text-sm font-semibold text-green-900 hover:bg-green-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );

  const messageContent = (
    <>
      {hasEmptyChat && !hasChat && (
        <p className="text-center text-sm text-gray-400 py-8">
          No messages yet. Start the conversation!
        </p>
      )}
      {hasChat &&
        project.campfireLines.map((line, idx) => {
          const lineDate = line.created_at
            ? startOfDay(new Date(line.created_at))
            : null;
          const prevDate =
            idx > 0 && project.campfireLines[idx - 1].created_at
              ? startOfDay(new Date(project.campfireLines[idx - 1].created_at))
              : null;
          const showDateSep =
            lineDate && (!prevDate || !isEqual(lineDate, prevDate));

          return (
            <div key={line.id}>
              {showDateSep && (
                <div className="flex items-center justify-center my-5">
                  <span className="rounded-full bg-gray-600/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200">
                    {format(new Date(line.created_at), "EEEE, MMMM d yyyy")}
                  </span>
                </div>
              )}
              <div className="group flex gap-3">
                {line.creator?.avatar_url ? (
                  <img
                    src={line.creator.avatar_url}
                    alt={line.creator.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-600 text-sm font-medium text-gray-200 sm:h-10 sm:w-10">
                    {line.creator?.name?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-100">
                      {line.creator?.name}
                    </span>
                    {line.created_at && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(line.created_at), "h:mmaaa")}
                      </span>
                    )}
                    <MessageMenu onAction={(action) => handleMessageAction(action, line)} />
                  </div>
                  <div
                    className="mt-1 text-sm text-gray-300 prose prose-sm prose-invert max-w-none [&_a]:text-blue-400 [&_a]:underline [&_figure]:inline-flex [&_figure]:items-center [&_figure]:gap-2 [&_figure]:my-1 [&_figure_img]:rounded-md [&_figure_img]:max-h-48 [&_figure_img]:w-auto [&_figcaption]:inline [&_figcaption]:text-xs [&_figcaption]:text-gray-400 [&_bc-attachment]:inline-flex [&_bc-attachment]:items-center [&_bc-attachment]:gap-1 [&_bc-attachment]:align-middle [&_bc-attachment]:mr-1.5 [&_bc-attachment_figure]:m-0 [&_bc-attachment_figure]:p-0 [&_bc-attachment_figure]:inline-flex [&_bc-attachment_figure]:items-center [&_bc-attachment_figure]:gap-1 [&_bc-attachment_img]:h-5 [&_bc-attachment_img]:w-5 [&_bc-attachment_img]:rounded-full [&_bc-attachment_img]:object-cover [&_bc-attachment_img]:max-h-5 [&_bc-attachment_figcaption]:inline [&_bc-attachment_figcaption]:text-xs [&_bc-attachment_figcaption]:text-blue-400 [&_bc-attachment_figcaption]:font-medium"
                    dangerouslySetInnerHTML={{ __html: line.content }}
                  />
                  {line.attachments && line.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {line.attachments.map((att) => (
                        <a
                          key={att.sgid || att.url}
                          href={att.app_download_url || att.download_url || att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg bg-gray-700/70 px-3 py-2.5 no-underline hover:bg-gray-600 transition-colors max-w-xs sm:max-w-sm"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-600">
                            <FileText className="h-5 w-5 text-gray-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-200">
                              {att.filename || att.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatBytes(att.byte_size)}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      <div ref={chatEndRef} />
    </>
  );

  const todoContent = hasTodos && (
    <div className="space-y-3">
      {project.todoLists.map((list) => {
        const todos = list.todos || [];
        const completed = todos.filter((t) => t.completed).length;
        const total = todos.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const isExpanded = expandedLists[list.id] !== false;

        return (
          <div key={list.id} className="rounded-lg bg-gray-900/60 border border-gray-700/50">
            <button
              onClick={() => toggleList(list.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-700/30 transition-colors rounded-lg"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-100 truncate">
                    {list.title || list.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {completed}/{total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-700">
                  <div
                    className="h-1.5 rounded-full bg-green-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>

            {isExpanded && todos.length > 0 && (
              <div className="px-4 pb-3 space-y-1">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-700/30 transition-colors"
                  >
                    {todo.completed ? (
                      <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 mt-0.5 text-gray-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm ${
                          todo.completed
                            ? "text-gray-500 line-through"
                            : "text-gray-200"
                        }`}
                      >
                        {todo.content?.replace(/<[^>]+>/g, "") || todo.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {todo.due_on && (
                          <span
                            className={`text-xs ${
                              !todo.completed && isOverdue(todo.due_on)
                                ? "text-red-400"
                                : "text-gray-500"
                            }`}
                          >
                            {format(new Date(todo.due_on), "MMM d")}
                          </span>
                        )}
                        {todo.assignees && todo.assignees.length > 0 && (
                          <div className="flex -space-x-1.5">
                            {todo.assignees.slice(0, 3).map((a) =>
                              a.avatar_url ? (
                                <img
                                  key={a.id}
                                  src={a.avatar_url}
                                  alt={a.name}
                                  title={a.name}
                                  className="h-5 w-5 rounded-full border border-gray-800 object-cover"
                                />
                              ) : (
                                <div
                                  key={a.id}
                                  title={a.name}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-800 bg-gray-600 text-[10px] font-medium text-gray-200"
                                >
                                  {a.name?.charAt(0)}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const ganttContent = hasTodos && (() => {
    const allTodos = project.todoLists.flatMap((list) =>
      (list.todos || []).map((t) => ({ ...t, listTitle: list.title || list.name }))
    );
    const datedTodos = allTodos.filter((t) => t.due_on);
    if (datedTodos.length === 0) {
      return (
        <p className="text-center text-sm text-gray-400 py-8">
          No todos with dates to display on the timeline.
        </p>
      );
    }

    const allDates = datedTodos.flatMap((t) => {
      const dates = [new Date(t.due_on)];
      if (t.starts_on) dates.push(new Date(t.starts_on));
      return dates;
    });
    const minDate = subDays(new Date(Math.min(...allDates)), 3);
    const maxDate = addDays(new Date(Math.max(...allDates)), 3);
    const totalDays = differenceInDays(maxDate, minDate) + 1;
    const today = startOfDay(new Date());
    const todayOffset = differenceInDays(today, minDate);
    const dayWidth = 32;

    const columns = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(minDate, i);
      const isMonthStart = d.getDate() === 1;
      const isToday = differenceInDays(d, today) === 0;
      columns.push({ date: d, isMonthStart, isToday, index: i });
    }

    const groupedByList = project.todoLists
      .map((list) => ({
        title: list.title || list.name,
        todos: (list.todos || []).map((t) => ({ ...t })),
      }))
      .filter((g) => g.todos.length > 0);

    return (
      <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full">
            {/* Left column: todo names */}
            <div className="w-[180px] shrink-0 sticky left-0 z-10 bg-gray-900 border-r border-gray-700/50">
              {/* Header spacer */}
              <div className="h-[52px] border-b border-gray-700/50 px-3 flex items-end pb-1">
                <span className="text-xs font-semibold text-gray-400">Task</span>
              </div>
              {groupedByList.map((group) => (
                <div key={group.title}>
                  <div className="h-8 flex items-center px-3 bg-gray-800/50 border-b border-gray-700/30">
                    <span className="text-xs font-semibold text-gray-300 truncate">{group.title}</span>
                  </div>
                  {group.todos.map((todo) => (
                    <div key={todo.id} className="h-8 flex items-center px-3 border-b border-gray-700/20">
                      <span className={`text-xs truncate ${todo.completed ? "text-gray-500 line-through" : "text-gray-300"}`}>
                        {todo.content?.replace(/<[^>]+>/g, "") || todo.title}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Right section: timeline */}
            <div className="flex-1">
              {/* Date headers */}
              <div className="flex border-b border-gray-700/50 h-[52px]">
                {columns.map((col) => (
                  <div
                    key={col.index}
                    className={`flex flex-col items-center justify-end pb-1 shrink-0 ${col.isToday ? "bg-blue-900/20" : ""}`}
                    style={{ width: dayWidth }}
                  >
                    {col.isMonthStart && (
                      <span className="text-[10px] font-semibold text-gray-400">
                        {format(col.date, "MMM")}
                      </span>
                    )}
                    <span className={`text-[10px] ${col.isToday ? "text-blue-400 font-bold" : "text-gray-500"}`}>
                      {format(col.date, "d")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="relative">
                {/* Today marker */}
                {todayOffset >= 0 && todayOffset < totalDays && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-blue-500/60 z-[5]"
                    style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                  />
                )}

                {groupedByList.map((group) => (
                  <div key={group.title}>
                    {/* List header row */}
                    <div className="h-8 border-b border-gray-700/30 bg-gray-800/30" />
                    {/* Todo rows */}
                    {group.todos.map((todo) => {
                      const hasDates = todo.due_on;
                      let barStart, barEnd, barColor;

                      if (hasDates) {
                        const startDate = todo.starts_on ? new Date(todo.starts_on) : new Date(todo.due_on);
                        const endDate = new Date(todo.due_on);
                        barStart = differenceInDays(startDate, minDate);
                        barEnd = differenceInDays(endDate, minDate);
                        if (barStart > barEnd) barStart = barEnd;

                        if (todo.completed) {
                          barColor = "bg-green-500/70";
                        } else if (isOverdue(todo.due_on)) {
                          barColor = "bg-red-500/70";
                        } else {
                          barColor = "bg-blue-500/70";
                        }
                      }

                      return (
                        <div key={todo.id} className="h-8 border-b border-gray-700/20 relative">
                          {hasDates ? (
                            <div
                              className={`absolute top-1.5 h-5 rounded ${barColor}`}
                              style={{
                                left: barStart * dayWidth + 2,
                                width: Math.max((barEnd - barStart + 1) * dayWidth - 4, 6),
                              }}
                              title={`${todo.content?.replace(/<[^>]+>/g, "") || todo.title}${todo.starts_on ? ` (${format(new Date(todo.starts_on), "MMM d")} – ${format(new Date(todo.due_on), "MMM d")})` : ` (due ${format(new Date(todo.due_on), "MMM d")})`}`}
                            />
                          ) : (
                            <span className="absolute top-1.5 left-2 text-[10px] text-gray-500 italic">
                              No date
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })();

  const todoViewToggle = (
    <div className="inline-flex rounded-md border border-gray-600 overflow-hidden">
      <button
        onClick={() => setTodoView("list")}
        className={`p-1.5 transition-colors ${todoView === "list" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"}`}
        title="List view"
      >
        <ListTodo className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setTodoView("gantt")}
        className={`p-1.5 transition-colors ${todoView === "gantt" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"}`}
        title="Timeline view"
      >
        <BarChart3 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const aiFeatures = [
    { action: "summarize", icon: AlignLeft, label: "Summarize Chat", desc: "Summarize long threads instantly" },
    { action: "analyze", icon: TrendingUp, label: "Project Analysis", desc: "Analyze project health" },
    { action: "chat", icon: Bot, label: "AI Chatbot", desc: "Ask questions about your project" },
    { action: "sentiment", icon: Smile, label: "Sentiment Analysis", desc: "Understand team mood" },
  ];

  const aiContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {aiFeatures.map(({ action, icon: Icon, label, desc }) => (
          <button
            key={action}
            onClick={() => (action === "chat" ? startAiChat() : runAI(action))}
            disabled={aiLoading}
            className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
              aiMode === action
                ? "border-purple-500 bg-purple-900/20 text-purple-300"
                : "border-gray-600 bg-gray-900/40 text-gray-300 hover:border-gray-500 hover:bg-gray-700/40"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-semibold">{label}</span>
            <span className="text-[10px] text-gray-400">{desc}</span>
          </button>
        ))}
      </div>

      {aiMode !== "chat" && aiLoading && !aiResult && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-900/60 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="text-sm text-gray-400">Thinking...</span>
        </div>
      )}

      {aiMode !== "chat" && aiResult && (
        <div className="rounded-lg border border-gray-700/50 bg-gray-900/60 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{aiResult}</p>
          {aiLoading && (
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <span className="text-xs text-gray-500">Generating...</span>
            </div>
          )}
        </div>
      )}

      {aiMode === "chat" && (
        <div className="overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900/60">
          <div className="max-h-64 overflow-y-auto p-3 space-y-3">
            {aiChatHistory.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">Ask anything about this project...</p>
            )}
            {aiChatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-200"
                  }`}
                >
                  {msg.content || (
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent inline-block" />
                      Thinking...
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={aiChatEndRef} />
          </div>
          <div className="border-t border-gray-700/50 p-3">
            <form onSubmit={sendAiChat} className="flex gap-2">
              <input
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                placeholder="Ask about this project..."
                disabled={aiLoading}
                className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!aiChatInput.trim() || aiLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ===== MOBILE: full-screen layout with tabs ===== */}
      <div className="flex flex-col h-[100dvh] sm:hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-gray-900 shadow-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href="/dashboard" className="shrink-0 text-gray-300 active:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-white">
                {mobileTab === "chat" ? "Chat" : "Todos"}
              </h1>
              <p className="truncate text-xs text-gray-400">{project.name}</p>
            </div>
            {people.length > 0 && (
              <div className="shrink-0 text-gray-400">
                <Users className="h-5 w-5" />
              </div>
            )}
          </div>
          {/* Tab bar */}
          <div className="flex border-t border-gray-700">
            <button
              onClick={() => setMobileTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                mobileTab === "chat"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </button>
            {hasTodos && (
              <button
                onClick={() => setMobileTab("todos")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  mobileTab === "todos"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-400"
                }`}
              >
                <ListTodo className="h-3.5 w-3.5" />
                Todos
              </button>
            )}
            <button
              onClick={() => setMobileTab("ai")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                mobileTab === "ai"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-gray-400"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-gray-800">
          {mobileTab === "chat" ? (
            <div className="p-4 space-y-5">
              {messageContent}
            </div>
          ) : mobileTab === "todos" ? (
            <div className="p-4">
              <div className="flex justify-end mb-3">{todoViewToggle}</div>
              {todoView === "list" ? todoContent : ganttContent}
            </div>
          ) : (
            <div className="p-4">
              {aiContent}
            </div>
          )}
        </div>

        {/* Sticky bottom input (chat only) */}
        {mobileTab === "chat" && (
          <div className="sticky bottom-0 z-20">
            {chatInput}
          </div>
        )}
      </div>

      {/* ===== DESKTOP: card-based layout ===== */}
      <div className="hidden sm:block">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <h1 className="text-2xl font-bold text-gray-100">{project.name}</h1>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                project.status === "active"
                  ? "bg-green-900/50 text-green-400"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {project.status}
            </span>
          </div>

          {/* Campfire / Chat */}
          {(hasChat || hasEmptyChat) && (
            <div className="mb-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
                <MessageCircle className="h-4 w-4" />
                Chat
              </h2>
              <div className="max-h-[600px] overflow-y-auto rounded-xl bg-gray-900 p-6 space-y-5">
                {messageContent}
              </div>
              {chatInput}
            </div>
          )}

          {/* Todos */}
          {hasTodos && (
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <ListTodo className="h-4 w-4" />
                  Todos
                </h2>
                {todoViewToggle}
              </div>
              {todoView === "list" ? todoContent : ganttContent}
            </div>
          )}

          {/* AI Features */}
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Insights
            </h2>
            {aiContent}
          </div>

          {/* People */}
          {people.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Users className="h-4 w-4" />
                Team ({people.length})
              </h2>
              <div className="flex items-center -space-x-3">
                {people.slice(0, 5).map((person, idx) => (
                  <div
                    key={person.id}
                    className="relative group"
                    style={{ zIndex: people.length - idx }}
                  >
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.name}
                        className="h-11 w-11 rounded-full border-2 border-gray-800 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-800 bg-blue-900/50 text-sm font-semibold text-blue-400">
                        {person.name?.charAt(0)}
                      </div>
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg z-50">
                      {person.name}
                    </div>
                  </div>
                ))}
                {people.length > 5 && (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-700 text-sm font-semibold text-gray-300">
                    +{people.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
