"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Users, Search } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";

const INITIAL_COUNT = 20;
const BATCH_SIZE = 20;
const BATCH_DELAY = 100; // ms between batches

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [countsById, setCountsById] = useState({});
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const loadPeople = async (url) => {
      const res = await fetch(url);
      if (res.status === 401) {
        window.location.href = "/";
        return null;
      }
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    };

    const applyData = (data) => {
      if (!data) return;
      setAllUsers(data);
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
    };

    // Load from cache first, then refresh from API in background
    loadPeople("/api/people")
      .then((data) => {
        applyData(data);
        setLoading(false);
        // Refresh from API in background
        loadPeople("/api/people?fresh=1").then((fresh) => {
          if (fresh && fresh.length > 0) applyData(fresh);
        }).catch(() => {});
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Independently load per-user open/closed todo counts from /api/users
    // and merge by id at render time. Failures are non-fatal — counts default to 0.
    loadPeople("/api/users")
      .then((users) => {
        if (!Array.isArray(users)) return;
        const map = {};
        for (const u of users) {
          map[u.id] = { open: u.incomplete || 0, closed: u.completed || 0 };
        }
        setCountsById(map);
      })
      .catch(() => {});
  }, []);

  const q = search.toLowerCase();
  const filtered = allUsers.filter(
    (u) =>
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.title?.toLowerCase().includes(q)
  );

  // When searching, show all filtered results; otherwise respect displayCount
  const visible = q ? filtered : filtered.slice(0, displayCount);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100">
            <Users className="h-7 w-7 text-blue-400" />
            Team Members
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-gray-400">
              {allUsers.length} members across all active projects
              {loadingMore && (
                <span className="ml-2 text-gray-600">· loading…</span>
              )}
            </p>
          )}
        </div>

        {loading && (
          <div className="overflow-hidden rounded-2xl border border-gray-700/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-gray-700/40 px-4 py-3 last:border-0"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-700 animate-pulse" />
                <div className="h-3 w-40 rounded bg-gray-700 animate-pulse" />
                <div className="ml-auto h-3 w-32 rounded bg-gray-700 animate-pulse" />
              </div>
            ))}
          </div>
        )}
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

            {/* Members table */}
            {visible.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-700/50">
                <table className="w-full table-auto border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/60 bg-gray-800/50 text-xs uppercase tracking-wide text-gray-400">
                      <th className="w-full px-4 py-3 font-semibold">Name</th>
                      <th className="hidden whitespace-nowrap px-4 py-3 font-semibold sm:table-cell">
                        Title
                      </th>
                      <th className="hidden whitespace-nowrap px-4 py-3 font-semibold md:table-cell">
                        Email
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                        Open
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                        Closed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((user) => {
                      const counts = countsById[user.id];
                      const open = counts?.open ?? 0;
                      const closed = counts?.closed ?? 0;
                      return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-700/40 last:border-0 hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <Image
                                src={user.avatar_url}
                                alt={user.name}
                                width={40}
                                height={40}
                                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-gray-700"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900/50 text-sm font-bold text-blue-400 ring-2 ring-gray-700">
                                {user.name?.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-100">{user.name}</p>
                              <p className="truncate text-xs text-gray-500 sm:hidden">
                                {user.title || user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 align-middle text-gray-400 sm:table-cell">
                          {user.title || "—"}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 align-middle md:table-cell">
                          {user.email ? (
                            <a
                              href={`mailto:${user.email}`}
                              className="text-blue-400 hover:underline"
                            >
                              {user.email}
                            </a>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle tabular-nums">
                          <span className={open > 0 ? "text-amber-400" : "text-gray-600"}>
                            {open}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle tabular-nums">
                          <span className={closed > 0 ? "text-green-400" : "text-gray-600"}>
                            {closed}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-gray-400">No members found.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
