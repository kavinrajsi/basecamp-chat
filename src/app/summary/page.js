"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  Square,
  MessageCircle,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function SummaryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMyOnly, setShowMyOnly] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    overdue: true,
    today: true,
    upcoming: true,
    chat: true,
    projects: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/summary");
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            window.location.href = "/";
          } else {
            setError(err.response?.data?.error || "Failed to load summary");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSummary();
    return () => { cancelled = true; };
  }, []);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const filteredTodos = useMemo(() => {
    if (!data) return [];
    let todos = data.todos.filter((t) => !t.completed);
    if (showMyOnly && data.identity) {
      const userId = data.identity.id;
      todos = todos.filter(
        (t) => t.assignees && t.assignees.some((a) => a.id === userId)
      );
    }
    return todos;
  }, [data, showMyOnly]);

  const overdueTodos = useMemo(
    () => filteredTodos.filter((t) => t.due_on && t.due_on < today),
    [filteredTodos, today]
  );

  const dueTodayTodos = useMemo(
    () => filteredTodos.filter((t) => t.due_on === today),
    [filteredTodos, today]
  );

  const upcomingTodos = useMemo(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split("T")[0];
    return filteredTodos.filter(
      (t) => t.due_on && t.due_on > today && t.due_on <= nextWeekStr
    );
  }, [filteredTodos, today]);

  const noDueDateTodos = useMemo(
    () => filteredTodos.filter((t) => !t.due_on),
    [filteredTodos]
  );

  const recentMessages = useMemo(() => {
    if (!data) return [];
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    return data.recentMessages.filter(
      (m) => new Date(m.created_at) >= cutoff
    );
  }, [data]);

  function toggleSection(key) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <ErrorMessage message={error} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Daily Summary</h1>
            <p className="mt-1 text-sm text-gray-400">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden">
            <button
              onClick={() => setShowMyOnly(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                showMyOnly
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              My Todos
            </button>
            <button
              onClick={() => setShowMyOnly(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                !showMyOnly
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              All Todos
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Overdue"
            count={overdueTodos.length}
            color="red"
            icon={AlertTriangle}
          />
          <StatCard
            label="Due Today"
            count={dueTodayTodos.length}
            color="blue"
            icon={CalendarCheck}
          />
          <StatCard
            label="Upcoming (7d)"
            count={upcomingTodos.length}
            color="yellow"
            icon={CalendarClock}
          />
          <StatCard
            label="Active Projects"
            count={data?.projects?.length || 0}
            color="green"
            icon={FolderOpen}
          />
        </div>

        {/* Overdue */}
        {overdueTodos.length > 0 && (
          <TodoSection
            title="Overdue"
            icon={AlertTriangle}
            iconColor="text-red-400"
            borderColor="border-red-500/30"
            bgColor="bg-red-900/10"
            todos={overdueTodos}
            expanded={expandedSections.overdue}
            onToggle={() => toggleSection("overdue")}
            today={today}
          />
        )}

        {/* Due Today */}
        <TodoSection
          title="Due Today"
          icon={CalendarCheck}
          iconColor="text-blue-400"
          borderColor="border-blue-500/30"
          bgColor="bg-blue-900/10"
          todos={dueTodayTodos}
          expanded={expandedSections.today}
          onToggle={() => toggleSection("today")}
          today={today}
          emptyMessage="No todos due today"
        />

        {/* Upcoming */}
        {upcomingTodos.length > 0 && (
          <TodoSection
            title="Upcoming (Next 7 Days)"
            icon={CalendarClock}
            iconColor="text-yellow-400"
            borderColor="border-yellow-500/30"
            bgColor="bg-yellow-900/10"
            todos={upcomingTodos}
            expanded={expandedSections.upcoming}
            onToggle={() => toggleSection("upcoming")}
            today={today}
          />
        )}

        {/* No due date */}
        {noDueDateTodos.length > 0 && (
          <TodoSection
            title={`No Due Date (${noDueDateTodos.length})`}
            icon={Square}
            iconColor="text-gray-400"
            borderColor="border-gray-600/30"
            bgColor="bg-gray-800/50"
            todos={noDueDateTodos}
            expanded={false}
            onToggle={() => toggleSection("nodate")}
            today={today}
            defaultCollapsed
          />
        )}

        {/* Recent Chat Activity */}
        <section className="mb-6">
          <button
            onClick={() => toggleSection("chat")}
            className="flex w-full items-center gap-2 mb-3"
          >
            {expandedSections.chat ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <MessageCircle className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Recent Chat (Last 24h)
            </h2>
            <span className="text-xs text-gray-500">
              {recentMessages.length} messages
            </span>
          </button>
          {expandedSections.chat && (
            <div className="rounded-xl border border-purple-500/20 bg-gray-800 overflow-hidden">
              {recentMessages.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  No chat activity in the last 24 hours
                </p>
              ) : (
                <div className="divide-y divide-gray-700/50 max-h-[400px] overflow-y-auto">
                  {recentMessages.slice(0, 50).map((msg) => (
                    <Link
                      key={msg.id}
                      href={`/projects/${msg.projectId}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-700/40 transition-colors"
                    >
                      {msg.creator?.avatar_url ? (
                        <img
                          src={msg.creator.avatar_url}
                          alt={msg.creator.name}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-600 text-xs font-medium text-gray-200">
                          {msg.creator?.name?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">
                            {msg.creator?.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            in {msg.projectName}
                          </span>
                          <span className="ml-auto shrink-0 text-xs text-gray-500">
                            {format(new Date(msg.created_at), "h:mmaaa")}
                          </span>
                        </div>
                        <div
                          className="mt-0.5 text-sm text-gray-400 line-clamp-1 [&_strong]:text-blue-400"
                          dangerouslySetInnerHTML={{ __html: msg.content }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Project Overview */}
        <section className="mb-6">
          <button
            onClick={() => toggleSection("projects")}
            className="flex w-full items-center gap-2 mb-3"
          >
            {expandedSections.projects ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <FolderOpen className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Project Overview
            </h2>
          </button>
          {expandedSections.projects && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data?.projects?.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="rounded-xl border border-gray-700 bg-gray-800 p-4 hover:border-blue-500/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-100 truncate">
                      {proj.name}
                    </h3>
                    <span className="shrink-0 rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">
                      active
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {proj.totalTodos > 0 && (
                      <span>
                        {proj.completedTodos}/{proj.totalTodos} todos done
                      </span>
                    )}
                    {proj.overdueTodos > 0 && (
                      <span className="text-red-400">
                        {proj.overdueTodos} overdue
                      </span>
                    )}
                    {proj.dueTodayTodos > 0 && (
                      <span className="text-blue-400">
                        {proj.dueTodayTodos} due today
                      </span>
                    )}
                    {proj.recentMessageCount > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {proj.recentMessageCount}
                      </span>
                    )}
                  </div>
                  {proj.totalTodos > 0 && (
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-700">
                      <div
                        className="h-1.5 rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${Math.round(
                            (proj.completedTodos / proj.totalTodos) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, count, color, icon: Icon }) {
  const colorMap = {
    red: "bg-red-900/30 text-red-400 border-red-500/20",
    blue: "bg-blue-900/30 text-blue-400 border-blue-500/20",
    yellow: "bg-yellow-900/30 text-yellow-400 border-yellow-500/20",
    green: "bg-green-900/30 text-green-400 border-green-500/20",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${colorMap[color]}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{count}</p>
    </div>
  );
}

function TodoSection({
  title,
  icon: Icon,
  iconColor,
  borderColor,
  bgColor,
  todos,
  expanded: initialExpanded,
  onToggle,
  today,
  emptyMessage,
  defaultCollapsed,
}) {
  const [expanded, setExpanded] = useState(
    defaultCollapsed ? false : initialExpanded
  );

  function toggle() {
    setExpanded((prev) => !prev);
    onToggle?.();
  }

  return (
    <section className="mb-6">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 mb-3"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
        <span className="text-xs text-gray-500">{todos.length} items</span>
      </button>
      {expanded && (
        <div
          className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}
        >
          {todos.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              {emptyMessage || "Nothing here"}
            </p>
          ) : (
            <div className="divide-y divide-gray-700/30">
              {todos.map((todo) => (
                <TodoRow key={todo.id} todo={todo} today={today} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TodoRow({ todo, today }) {
  const label = todo.content?.replace(/<[^>]+>/g, "") || todo.title;
  const isOverdue = todo.due_on && todo.due_on < today;

  return (
    <Link
      href={`/projects/${todo.projectId}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-700/30 transition-colors"
    >
      {todo.completed ? (
        <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
      ) : (
        <Square className="h-4 w-4 shrink-0 mt-0.5 text-gray-500" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            todo.completed ? "text-gray-500 line-through" : "text-gray-200"
          }`}
        >
          {label}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs text-gray-500">{todo.projectName}</span>
          {todo.listName && (
            <span className="text-xs text-gray-600">{todo.listName}</span>
          )}
          {todo.due_on && (
            <span
              className={`text-xs ${
                isOverdue ? "text-red-400 font-medium" : "text-gray-500"
              }`}
            >
              {isOverdue ? "Overdue: " : ""}
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
    </Link>
  );
}
