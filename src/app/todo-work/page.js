"use client";

import { useEffect, useState } from "react";
import { Briefcase, Square, ChevronDown, ChevronRight, Search, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";

const YEARS = [2025, 2024, 2023];

export default function TodoWorkPage() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    fetch("/api/todo-list")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/";
          return null;
        }
        if (!res.ok) throw new Error("Failed to load todos");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        // Flatten all todos across projects/lists
        const flat = [];
        for (const project of data) {
          for (const list of project.lists) {
            for (const todo of list.todos) {
              flat.push({
                ...todo,
                project_name: project.name,
                list_name: list.name,
              });
            }
          }
        }
        setTodos(flat);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleYear = (year) =>
    setCollapsed((prev) => ({ ...prev, [year]: !prev[year] }));

  const q = search.toLowerCase();

  const filtered = q
    ? todos.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.project_name.toLowerCase().includes(q) ||
          t.assignees.some((a) => a.name.toLowerCase().includes(q))
      )
    : todos;

  const grouped = {};
  for (const year of YEARS) {
    grouped[year] = filtered.filter((t) => {
      if (!t.created_at) return false;
      return new Date(t.created_at).getFullYear() === year;
    });
  }

  const totalFiltered = YEARS.reduce((s, y) => s + grouped[y].length, 0);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100">
            <Briefcase className="h-7 w-7 text-blue-400" />
            Todo Work
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-gray-400">
              {totalFiltered} open todos across {YEARS.join(", ")}
            </p>
          )}
        </div>

        {/* Search */}
        {!loading && !error && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, assignee, or project..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden animate-pulse">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-gray-700" />
                    <div className="h-4 w-20 rounded bg-gray-700" />
                  </div>
                  <div className="h-3 w-14 rounded bg-gray-700" />
                </div>
                <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2 px-5 py-2.5">
                      <div className="h-4 w-4 rounded bg-gray-700/60" />
                      <div className="h-3 rounded bg-gray-700/60" style={{ width: `${40 + j * 15}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {/* Year groups */}
        {!loading && !error && (
          <div className="space-y-4">
            {totalFiltered === 0 && (
              <p className="py-12 text-center text-sm text-gray-400">No todos found.</p>
            )}

            {YEARS.map((year) => {
              const yearTodos = grouped[year];
              if (yearTodos.length === 0) return null;
              const isCollapsed = collapsed[year];

              return (
                <div key={year} className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
                  {/* Year header */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-semibold text-gray-100">{year}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {yearTodos.length} open
                    </span>
                  </button>

                  {/* Todos */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-700 px-5 pb-3 space-y-0.5">
                      {yearTodos.map((todo) => (
                        <TodoRow key={todo.id} todo={todo} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function TodoRow({ todo }) {
  const content = (
    <>
      <Square className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-snug text-gray-200">
            {todo.title}
          </span>
          {todo.app_url && (
            <ExternalLink className="h-3 w-3 shrink-0 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {todo.due_on && (
            <span className="text-[11px] text-amber-500/80">due {todo.due_on}</span>
          )}
          {todo.assignees.length > 0 && (
            <div className="flex items-center gap-1">
              {todo.assignees.map((a) => (
                <span key={a.id} className="text-[11px] text-gray-500">
                  {a.name}
                </span>
              ))}
            </div>
          )}
          <span className="text-[11px] text-gray-600">{todo.project_name}</span>
        </div>
      </div>
    </>
  );

  if (todo.app_url) {
    return (
      <a
        href={todo.app_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2.5 py-1.5 group rounded-md -mx-1.5 px-1.5 hover:bg-gray-700/40 transition-colors"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {content}
    </div>
  );
}
