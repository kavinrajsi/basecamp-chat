"use client";

import { useEffect, useState } from "react";
import { Users, Search } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";

const INITIAL_COUNT = 20;
const BATCH_SIZE = 20;
const BATCH_DELAY = 100; // ms between batches

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState([]);
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
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="h-14 w-14 rounded-full bg-gray-700 animate-pulse" />
                <div className="h-2.5 w-12 rounded bg-gray-700 animate-pulse" />
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

            {/* Photo grid */}
            {visible.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {visible.map((user) => (
                  <div key={user.id} className="flex flex-col items-center gap-1.5">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-700"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-900/50 text-xl font-bold text-blue-400 ring-2 ring-gray-700">
                        {user.name?.charAt(0)}
                      </div>
                    )}
                    <span className="w-full text-center text-[11px] leading-tight text-gray-300 line-clamp-2">
                      {user.name}
                    </span>
                  </div>
                ))}
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
