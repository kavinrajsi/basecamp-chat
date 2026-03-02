"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckSquare, Square, Calendar, Folder, CheckCheck, LayoutList } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

const GROUP_MODES = [
  { value: "bucket", label: "Project", icon: Folder },
  { value: "date", label: "Date", icon: Calendar },
];

function formatDue(due_on) {
  if (!due_on) return null;
  const date = new Date(due_on + "T00:00:00");
  const today = new Date(new Date().toDateString());
  const diff = Math.round((date - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 0) return { label: "Due today", today: true };
  if (diff === 1) return { label: "Due tomorrow", soon: true };
  if (diff <= 7) return { label: `Due in ${diff}d`, soon: true };
  return {
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

function dateGroupLabel(date) {
  if (!date) return "No due date";
  const d = new Date(date + "T00:00:00");
  const today = new Date(new Date().toDateString());
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)
    return {
      label: `Overdue · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      overdue: true,
    };
  if (diff === 0) return { label: "Today", today: true };
  if (diff === 1) return { label: "Tomorrow", soon: true };
  if (diff <= 6)
    return {
      label: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
      soon: true,
    };
  return {
    label: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    overdue: false,
  };
}

function TodoItem({ todo, showProject }) {
  const due = formatDue(todo.due_on);

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-700/30 last:border-0 hover:bg-gray-800/30 transition-colors">
      {todo.completed ? (
        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <Square className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${todo.completed ? "line-through text-gray-500" : "text-gray-100"}`}>
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {showProject && todo.projectName && (
            <Link
              href={`/projects/${todo.projectId}`}
              className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
            >
              <Folder className="h-3 w-3" />
              {todo.projectName}
            </Link>
          )}
          {todo.listName && !showProject && (
            <span className="text-xs text-gray-500">{todo.listName}</span>
          )}
          {todo.listName && showProject && (
            <span className="text-xs text-gray-500">· {todo.listName}</span>
          )}
          {due && (
            <span
              className={`flex items-center gap-1 text-xs ${
                due.overdue ? "text-red-400" : due.today ? "text-yellow-400" : due.soon ? "text-blue-400" : "text-gray-500"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {due.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyTodosPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("open");
  const [groupBy, setGroupBy] = useState("bucket");

  const fetchData = useCallback(
    (gby) => {
      setLoading(true);
      setError(null);
      fetch(`/api/my-todos?group_by=${gby}`)
        .then((res) => {
          if (res.status === 401) { window.location.href = "/"; return null; }
          if (!res.ok) throw new Error("Failed to load todos");
          return res.json();
        })
        .then((d) => { if (d) setData(d); })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => { fetchData(groupBy); }, [groupBy, fetchData]);

  const filteredGroups = data?.groups
    ?.map((g) => ({
      ...g,
      todos: g.todos.filter((t) => {
        if (filter === "open") return !t.completed;
        if (filter === "done") return t.completed;
        return true;
      }),
    }))
    .filter((g) => g.todos.length > 0);

  const allTodos = data?.groups?.flatMap((g) => g.todos) ?? [];
  const totalOpen = allTodos.filter((t) => !t.completed).length;
  const totalDone = allTodos.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-2xl px-0 sm:px-4 sm:py-6 pb-20">
        {/* Page header */}
        <div className="px-4 pt-5 pb-3 sm:px-0">
          <div className="flex items-center gap-3 mb-1">
            <CheckSquare className="h-6 w-6 text-green-400" />
            <h1 className="text-2xl font-bold text-gray-100">My Todos</h1>
          </div>
          {data && (
            <p className="text-sm text-gray-400 pl-9">
              {totalOpen} open &middot; {totalDone} done
            </p>
          )}

          {/* Group + Filter controls */}
          <div className="flex items-center justify-between mt-4 gap-3">
            {/* Group by toggle */}
            <div className="flex rounded-lg bg-gray-800 p-0.5 gap-0.5">
              {GROUP_MODES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setGroupBy(value)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    groupBy === value
                      ? "bg-gray-700 text-gray-100 shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Status filter pills */}
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === f.value
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                  }`}
                >
                  {f.label}
                  {f.value === "open" && totalOpen > 0 && (
                    <span className="ml-1 text-green-300">{totalOpen}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && <div className="px-4 sm:px-0"><LoadingSpinner /></div>}
        {error && <div className="px-4 sm:px-0"><ErrorMessage message={error} /></div>}

        {!loading && !error && filteredGroups?.length === 0 && (
          <div className="px-4 sm:px-0 py-16 text-center">
            <CheckCheck className="mx-auto h-12 w-12 text-green-500/40 mb-3" />
            <p className="text-gray-400 text-sm">
              {filter === "open" ? "No open todos — you're all caught up!" : "No todos here."}
            </p>
          </div>
        )}

        {!loading && !error && filteredGroups && filteredGroups.length > 0 && (
          <div className="mt-1 sm:space-y-3">
            {filteredGroups.map((group) => {
              const dateInfo = groupBy === "date" ? dateGroupLabel(group.date) : null;

              return (
                <div
                  key={group.key}
                  className="overflow-hidden bg-gray-900 sm:rounded-2xl border-t border-gray-700/50 sm:border"
                >
                  {/* Group header */}
                  {groupBy === "bucket" ? (
                    <Link
                      href={`/projects/${group.projectId}`}
                      className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors"
                    >
                      <Folder className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-200 flex-1">{group.label}</span>
                      <span className="text-xs text-gray-500">
                        {group.todos.length} todo{group.todos.length !== 1 ? "s" : ""}
                      </span>
                    </Link>
                  ) : (
                    <div
                      className={`flex items-center gap-2 px-4 py-3 border-b border-gray-700/50 ${
                        dateInfo?.overdue ? "bg-red-950/30" : dateInfo?.today ? "bg-yellow-950/20" : ""
                      }`}
                    >
                      <Calendar
                        className={`h-4 w-4 shrink-0 ${
                          dateInfo?.overdue ? "text-red-400" : dateInfo?.today ? "text-yellow-400" : dateInfo?.soon ? "text-blue-400" : "text-gray-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold flex-1 ${
                          dateInfo?.overdue ? "text-red-300" : dateInfo?.today ? "text-yellow-300" : dateInfo?.soon ? "text-blue-300" : "text-gray-400"
                        }`}
                      >
                        {dateInfo?.label ?? "No due date"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {group.todos.length} todo{group.todos.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Todos */}
                  {group.todos.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} showProject={groupBy === "date"} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
