"use client";

import { useEffect, useState } from "react";
import { File, ChevronDown, ChevronRight, Search, ExternalLink, Download, Upload, FileText, Folder, Paperclip } from "lucide-react";
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

const TABS = [
  { key: "all", label: "All" },
  { key: "upload", label: "Uploads", icon: Upload },
  { key: "document", label: "Documents", icon: FileText },
  { key: "vault", label: "Folders", icon: Folder },
  { key: "attachment", label: "Attachments", icon: Paperclip },
];

function formatSize(bytes) {
  if (bytes == null || bytes === 0) return null;
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

function sizeRangeLabel(label) {
  switch (label) {
    case "Huge": return "> 100 MB";
    case "Large": return "10\u2013100 MB";
    case "Medium": return "1\u201310 MB";
    case "Small": return "100 KB\u20131 MB";
    case "Tiny": return "< 100 KB";
    default: return "";
  }
}

function groupBySize(files) {
  return SIZE_CATEGORIES.map((cat) => ({
    label: cat.label,
    sublabel: sizeRangeLabel(cat.label),
    files: files.filter((f) => (f.byte_size || 0) >= cat.min && (f.byte_size || 0) < cat.max),
  })).filter((g) => g.files.length > 0);
}

function groupByProject(files) {
  const map = {};
  for (const f of files) {
    const key = f.project_name || "Unknown";
    if (!map[key]) map[key] = [];
    map[key].push(f);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, items]) => ({
      label: name,
      sublabel: null,
      files: items,
    }));
}

function FileRow({ file }) {
  const displayName = file.title || file.filename || "Untitled";

  const iconMap = {
    upload: <File className="h-3.5 w-3.5 shrink-0 text-gray-500" />,
    document: <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />,
    vault: <Folder className="h-3.5 w-3.5 shrink-0 text-yellow-400" />,
    attachment: <Paperclip className="h-3.5 w-3.5 shrink-0 text-purple-400" />,
  };

  const icon = iconMap[file.type] || iconMap.upload;

  const meta = [];
  if (file.type === "vault") {
    const parts = [];
    if (file.documents_count) parts.push(`${file.documents_count} doc${file.documents_count !== 1 ? "s" : ""}`);
    if (file.uploads_count) parts.push(`${file.uploads_count} upload${file.uploads_count !== 1 ? "s" : ""}`);
    if (file.vaults_count) parts.push(`${file.vaults_count} folder${file.vaults_count !== 1 ? "s" : ""}`);
    if (parts.length > 0) meta.push(parts.join(", "));
  } else {
    const size = formatSize(file.byte_size);
    if (size) meta.push(size);
    if (file.content_type && file.type === "upload") meta.push(file.content_type);
  }
  meta.push(file.project_name);
  meta.push(file.creator);
  if (file.created_at) meta.push(formatDate(file.created_at));

  const showDownload = file.download_url && file.type !== "document" && file.type !== "vault";

  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-700/40 transition-colors group">
      <a
        href={file.app_url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-gray-200 truncate">{displayName}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-5.5 text-[11px] text-gray-500">
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </a>
      {showDownload && (
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
  );
}

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [activeTab, setActiveTab] = useState("all");

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

  // Counts per type
  const counts = { upload: 0, document: 0, vault: 0, attachment: 0 };
  for (const f of files) {
    if (counts[f.type] !== undefined) counts[f.type]++;
  }

  const q = search.toLowerCase();
  const filtered = files.filter((f) => {
    // Tab filter
    if (activeTab !== "all" && f.type !== activeTab) return false;
    // Search filter
    if (!q) return true;
    const title = (f.title || f.filename || "").toLowerCase();
    const project = (f.project_name || "").toLowerCase();
    const creator = (f.creator || "").toLowerCase();
    const contentType = (f.content_type || "").toLowerCase();
    return title.includes(q) || project.includes(q) || creator.includes(q) || contentType.includes(q);
  });

  // Build groups based on active tab
  let sections;
  if (activeTab === "upload") {
    sections = [{ type: "upload", title: null, groups: groupBySize(filtered) }];
  } else if (activeTab === "document" || activeTab === "vault" || activeTab === "attachment") {
    sections = [{ type: activeTab, title: null, groups: groupByProject(filtered) }];
  } else {
    // "all" tab: show each type as a section with its own grouping
    const typeOrder = ["upload", "document", "vault", "attachment"];
    const typeLabels = { upload: "Uploads", document: "Documents", vault: "Folders", attachment: "Attachments" };
    sections = typeOrder
      .map((type) => {
        const typeFiles = filtered.filter((f) => f.type === type);
        if (typeFiles.length === 0) return null;
        return {
          type,
          title: typeLabels[type],
          groups: type === "upload" ? groupBySize(typeFiles) : groupByProject(typeFiles),
        };
      })
      .filter(Boolean);
  }

  const totalSize = files.reduce((sum, f) => sum + (f.byte_size || 0), 0);

  // Build summary line
  const summaryParts = [];
  if (counts.upload) summaryParts.push(`${counts.upload} upload${counts.upload !== 1 ? "s" : ""}`);
  if (counts.document) summaryParts.push(`${counts.document} document${counts.document !== 1 ? "s" : ""}`);
  if (counts.vault) summaryParts.push(`${counts.vault} folder${counts.vault !== 1 ? "s" : ""}`);
  if (counts.attachment) summaryParts.push(`${counts.attachment} attachment${counts.attachment !== 1 ? "s" : ""}`);
  const summaryText = summaryParts.length > 0
    ? `${summaryParts.join(", ")}${totalSize > 0 ? ` \u00b7 ${formatSize(totalSize)} total` : ""}`
    : `${files.length} files`;

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
            <p className="mt-1 text-sm text-gray-400">{summaryText}</p>
          )}
        </div>

        {/* Search */}
        {!loading && !error && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, project, creator, or type..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Tabs */}
        {!loading && !error && (
          <div className="mb-6 flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = tab.key === "all" ? files.length : counts[tab.key] || 0;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750 hover:text-gray-300"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {tab.label}
                  <span className={`text-xs ${isActive ? "text-blue-400/70" : "text-gray-500"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
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

        {/* File sections & groups */}
        {!loading && !error && (
          <div className="space-y-6">
            {sections.length === 0 && filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-400">No files found.</p>
            )}

            {sections.map((section, si) => (
              <div key={si} className="space-y-4">
                {section.title && (
                  <h2 className="text-lg font-semibold text-gray-200">{section.title}</h2>
                )}

                {section.groups.map((group) => {
                  const groupKey = `${section.type || "all"}-${group.label}`;
                  const isCollapsed = collapsed[groupKey];
                  const groupSize = group.files.reduce((s, f) => s + (f.byte_size || 0), 0);

                  return (
                    <div
                      key={groupKey}
                      className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden"
                    >
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="font-semibold text-gray-100">{group.label}</span>
                          {group.sublabel && (
                            <span className="text-xs text-gray-500">({group.sublabel})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{group.files.length} {group.files.length === 1 ? "item" : "items"}</span>
                          {groupSize > 0 && <span>{formatSize(groupSize)}</span>}
                        </div>
                      </button>

                      {/* File rows */}
                      {!isCollapsed && (
                        <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                          {group.files.map((file) => (
                            <FileRow key={file.id} file={file} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
