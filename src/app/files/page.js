"use client";

import { useEffect, useState } from "react";
import { File, ChevronDown, ChevronRight, Search, ExternalLink, Download } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";

const SIZE_CATEGORIES = [
  { label: "Huge", min: 100 * 1024 * 1024, max: Infinity },
  { label: "Large", min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { label: "Medium", min: 1 * 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: "Small", min: 100 * 1024, max: 1 * 1024 * 1024 },
  { label: "Tiny", min: 0, max: 100 * 1024 },
];

function formatSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    fetch("/api/files")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/";
          return null;
        }
        if (!res.ok) throw new Error("Failed to load files");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setFiles(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleGroup = (label) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  const q = search.toLowerCase();
  const filtered = files.filter(
    (f) =>
      !q ||
      f.filename.toLowerCase().includes(q) ||
      f.project_name.toLowerCase().includes(q) ||
      f.creator.toLowerCase().includes(q) ||
      f.content_type.toLowerCase().includes(q)
  );

  const groups = SIZE_CATEGORIES.map((cat) => ({
    ...cat,
    files: filtered.filter((f) => f.byte_size >= cat.min && f.byte_size < cat.max),
  })).filter((g) => g.files.length > 0);

  const totalSize = files.reduce((sum, f) => sum + f.byte_size, 0);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100">
            <File className="h-7 w-7 text-blue-400" />
            Files
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-gray-400">
              {files.length} files · {formatSize(totalSize)} total
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
              placeholder="Search by filename, project, uploader, or type..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden animate-pulse">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-gray-700" />
                    <div className="h-4 w-24 rounded bg-gray-700" />
                  </div>
                  <div className="h-3 w-16 rounded bg-gray-700" />
                </div>
                <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="px-5 py-3 flex items-center gap-3">
                      <div className="h-3 w-3 rounded bg-gray-700" />
                      <div className="h-3 rounded bg-gray-700" style={{ width: `${40 + j * 15}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {/* File groups */}
        {!loading && !error && (
          <div className="space-y-4">
            {groups.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-400">No files found.</p>
            )}

            {groups.map((group) => {
              const isCollapsed = collapsed[group.label];
              const groupSize = group.files.reduce((s, f) => s + f.byte_size, 0);

              return (
                <div
                  key={group.label}
                  className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden"
                >
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-semibold text-gray-100">{group.label}</span>
                      <span className="text-xs text-gray-500">
                        ({group.label === "Huge" ? "> 100 MB" :
                          group.label === "Large" ? "10–100 MB" :
                          group.label === "Medium" ? "1–10 MB" :
                          group.label === "Small" ? "100 KB–1 MB" :
                          "< 100 KB"})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{group.files.length} files</span>
                      <span>{formatSize(groupSize)}</span>
                    </div>
                  </button>

                  {/* File rows */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                      {group.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between px-5 py-3 hover:bg-gray-700/40 transition-colors group"
                        >
                          <a
                            href={file.app_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1"
                          >
                            <div className="flex items-center gap-2">
                              <File className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                              <span className="text-sm text-gray-200 truncate">
                                {file.filename}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-5.5 text-[11px] text-gray-500">
                              <span>{formatSize(file.byte_size)}</span>
                              <span>{file.content_type}</span>
                              <span>{file.project_name}</span>
                              <span>{file.creator}</span>
                              {file.created_at && <span>{formatDate(file.created_at)}</span>}
                            </div>
                          </a>
                          {file.download_url && (
                            <a
                              href={file.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-600/50 hover:text-gray-300 transition-colors"
                              title="Download file"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </div>
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
