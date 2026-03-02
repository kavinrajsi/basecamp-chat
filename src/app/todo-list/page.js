"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Square, ChevronRight, ChevronDown, ChevronLeft, ListTodo, Search } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";

const INITIAL_COUNT = 20;
const BATCH_SIZE = 10;
const BATCH_DELAY = 150;

export default function TodoListPage() {
  const [allProjects, setAllProjects] = useState([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedLists, setExpandedLists] = useState({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetch("/api/todo-list")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/";
          return null;
        }
        if (!res.ok) throw new Error("Failed to load todo lists");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setAllProjects(data);
        // Expand first 20 projects by default
        const expanded = {};
        data.slice(0, INITIAL_COUNT).forEach((p) => { expanded[p.id] = true; });
        setExpandedProjects(expanded);

        if (data.length > INITIAL_COUNT) {
          setLoadingMore(true);
          let count = INITIAL_COUNT;
          const loadBatch = () => {
            count = Math.min(count + BATCH_SIZE, data.length);
            setDisplayCount(count);
            if (count < data.length) {
              setTimeout(loadBatch, BATCH_DELAY);
            } else {
              setLoadingMore(false);
            }
          };
          setTimeout(loadBatch, BATCH_DELAY);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleProject = (id) =>
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleList = (id) =>
    setExpandedLists((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const q = search.toLowerCase();

  // When searching show all; otherwise cap to displayCount
  const sourceProjects = q ? allProjects : allProjects.slice(0, displayCount);

  const filteredProjects = sourceProjects
    .map((project) => ({
      ...project,
      lists: project.lists
        .map((list) => ({
          ...list,
          todos: list.todos.filter(
            (t) =>
              !q ||
              t.title.toLowerCase().includes(q) ||
              t.assignees.some((a) => a.name.toLowerCase().includes(q))
          ),
        }))
        .filter((list) => !q || list.todos.length > 0 || list.name.toLowerCase().includes(q)),
    }))
    .filter((p) => !q || p.lists.length > 0 || p.name.toLowerCase().includes(q));

  // Use allProjects for totals so they don't change as we reveal
  const projects = allProjects;

  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  const paginatedProjects = filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalTodos = projects.reduce(
    (sum, p) => sum + p.lists.reduce((s, l) => s + l.todos.length, 0),
    0
  );
  const totalOpen = projects.reduce(
    (sum, p) =>
      sum + p.lists.reduce((s, l) => s + l.todos.filter((t) => !t.completed).length, 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100">
            <ListTodo className="h-7 w-7 text-blue-400" />
            Todo Lists
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-gray-400">
              {totalOpen} open · {totalTodos} total across {projects.length} projects
              {loadingMore && (
                <span className="ml-2 text-gray-600">· loading…</span>
              )}
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
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search todos, assignees, or lists..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden animate-pulse">
                {/* Project header skeleton */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-gray-700" />
                    <div className="h-4 w-36 rounded bg-gray-700" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-3 w-14 rounded bg-gray-700" />
                    <div className="h-3 w-14 rounded bg-gray-700" />
                  </div>
                </div>
                {/* List rows skeleton */}
                <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="px-5 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-gray-700" />
                          <div className="h-3 w-28 rounded bg-gray-700" />
                        </div>
                        <div className="h-3 w-8 rounded bg-gray-700" />
                      </div>
                      {Array.from({ length: 2 }).map((_, k) => (
                        <div key={k} className="flex items-center gap-2 pl-5">
                          <div className="h-3.5 w-3.5 rounded bg-gray-700/60" />
                          <div className="h-3 rounded bg-gray-700/60" style={{ width: `${50 + (k * 20)}%` }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && (
          <div className="space-y-4">
            {filteredProjects.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-400">No todos found.</p>
            )}

            {paginatedProjects.map((project) => {
              const projectOpen = project.lists.reduce(
                (s, l) => s + l.todos.filter((t) => !t.completed).length,
                0
              );
              const projectTotal = project.lists.reduce((s, l) => s + l.todos.length, 0);
              const isProjectOpen = expandedProjects[project.id];

              return (
                <div
                  key={project.id}
                  className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden"
                >
                  {/* Project header */}
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isProjectOpen ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-semibold text-gray-100">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Square className="h-3.5 w-3.5 text-gray-500" />
                        {projectOpen} open
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5 text-green-600" />
                        {projectTotal - projectOpen} done
                      </span>
                    </div>
                  </button>

                  {/* Todo lists */}
                  {isProjectOpen && (
                    <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                      {project.lists.map((list) => {
                        const listOpen = list.todos.filter((t) => !t.completed).length;
                        const isListOpen = expandedLists[list.id] !== false; // expanded by default

                        return (
                          <div key={list.id}>
                            {/* List header */}
                            <button
                              onClick={() => toggleList(list.id)}
                              className="flex w-full items-center justify-between px-5 py-2.5 hover:bg-gray-700/40 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isListOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                )}
                                <span className="text-sm font-medium text-gray-200">
                                  {list.name}
                                </span>
                                {list.description && (
                                  <span className="hidden sm:inline text-xs text-gray-500 truncate max-w-[200px]">
                                    — {list.description}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {listOpen}/{list.todos.length}
                              </span>
                            </button>

                            {/* Todos */}
                            {isListOpen && list.todos.length > 0 && (
                              <div className="px-5 pb-3 space-y-0.5">
                                {/* Open todos first */}
                                {list.todos.filter((t) => !t.completed).map((todo) => (
                                  <TodoRow key={todo.id} todo={todo} />
                                ))}
                                {/* Completed todos */}
                                {list.todos.filter((t) => t.completed).map((todo) => (
                                  <TodoRow key={todo.id} todo={todo} />
                                ))}
                              </div>
                            )}

                            {isListOpen && list.todos.length === 0 && (
                              <p className="px-5 pb-3 text-xs text-gray-600 italic">
                                No todos in this list.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length} projects
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-lg border text-xs font-medium transition-colors ${
                        p === page
                          ? "border-blue-500 bg-blue-500/20 text-blue-400"
                          : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TodoRow({ todo }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {todo.completed ? (
        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <Square className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            todo.completed ? "text-gray-500 line-through" : "text-gray-200"
          }`}
        >
          {todo.title}
        </p>
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
        </div>
      </div>
    </div>
  );
}
