"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CheckSquare, Square, Search, Briefcase, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/";
          return null;
        }
        if (!res.ok) throw new Error("Failed to load users");
        return res.json();
      })
      .then((data) => {
        if (data) setUsers(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalTodos = users.reduce((sum, u) => sum + u.total, 0);
  const totalIncomplete = users.reduce((sum, u) => sum + u.incomplete, 0);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100">
            <Users className="h-7 w-7 text-blue-400" />
            Team Members
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-gray-400">
              {users.length} members across all active projects &mdash;{" "}
              {totalIncomplete} open todos out of {totalTodos} total
            </p>
          )}
        </div>

        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or title..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* User list */}
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-12">No members found.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((user, idx) => {
                  const pct = user.total > 0 ? Math.round((user.completed / user.total) * 100) : 0;
                  return (
                    <div
                      key={user.id}
                      className="rounded-xl border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-gray-600"
                    >
                      <div className="flex items-start gap-4">
                        {/* Rank */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-400">
                          {idx + 1}
                        </div>

                        {/* Avatar */}
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-900/50 text-lg font-bold text-blue-400">
                            {user.name?.charAt(0)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-100">{user.name}</span>
                            {user.title && (
                              <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                                {user.title}
                              </span>
                            )}
                          </div>
                          {user.email && (
                            <p className="mt-0.5 text-xs text-gray-400">{user.email}</p>
                          )}
                        </div>

                        {/* Todo stats */}
                        <div className="shrink-0 text-right">
                          <div className="text-2xl font-bold text-gray-100">{user.total}</div>
                          <div className="text-xs text-gray-400">todos</div>
                        </div>
                      </div>

                      {/* Todo breakdown + progress bar */}
                      {user.total > 0 && (
                        <div className="mt-4 pl-[88px]">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <CheckSquare className="h-3.5 w-3.5 text-green-500" />
                                {user.completed} done
                              </span>
                              <span className="flex items-center gap-1">
                                <Square className="h-3.5 w-3.5 text-gray-500" />
                                {user.incomplete} open
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-400">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-700">
                            <div
                              className="h-1.5 rounded-full bg-green-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {user.total === 0 && (
                        <p className="mt-2 pl-[88px] text-xs text-gray-500 italic">No todos assigned</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
