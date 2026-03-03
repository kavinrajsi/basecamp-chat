"use client";

import { useEffect, useState, useCallback } from "react";
import { Webhook, Search, Copy, Check, ExternalLink, ChevronDown, ChevronRight, User, Sparkles, Loader2, ClipboardCopy } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";

const KIND_COLORS = {
  created: "bg-green-500/20 text-green-400 border-green-500/30",
  changed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  trashed: "bg-red-500/20 text-red-400 border-red-500/30",
};
const DEFAULT_KIND_COLOR = "bg-gray-500/20 text-gray-400 border-gray-500/30";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function DetailField({ label, value, href }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-sm text-blue-400 hover:text-blue-300 truncate">
          {value} <ExternalLink className="inline h-3 w-3" />
        </a>
      ) : (
        <p className="mt-0.5 text-sm text-gray-200 break-words">{value}</p>
      )}
    </div>
  );
}

function EventRow({ event, expanded, onToggle }) {
  const [leaveDate, setLeaveDate] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveCopied, setLeaveCopied] = useState(false);

  const kindColor = KIND_COLORS[event.kind] || DEFAULT_KIND_COLOR;
  const recording = event.recording;
  const creator = event.creator;
  const recordingType = recording?.type?.replace(/_/g, " ") || null;
  const recordingTitle = recording?.title || recording?.subject || null;
  const creatorName = creator?.name || null;
  const appUrl = recording?.app_url || null;

  const handleFetchLeaveDate = async () => {
    if (leaveLoading) return;
    setLeaveLoading(true);
    setLeaveDate(null);
    try {
      const res = await fetch("/api/webhooks/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording, creator }),
      });
      if (!res.ok) throw new Error("Failed");
      const text = await res.text();
      setLeaveDate(text);
    } catch {
      setLeaveDate("Failed to fetch leave date.");
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleCopyDate = async () => {
    if (!leaveDate) return;
    try {
      await navigator.clipboard.writeText(leaveDate);
      setLeaveCopied(true);
      setTimeout(() => setLeaveCopied(false), 2000);
    } catch {}
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 hover:bg-gray-700/40 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        )}
        <span
          className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${kindColor}`}
        >
          {event.kind}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {recordingTitle ? (
              <span className="text-sm text-gray-200 truncate">{recordingTitle}</span>
            ) : (
              <span className="text-sm text-gray-500 italic">No title</span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500">
            {recordingType && <span>{recordingType}</span>}
            {creatorName && <span>{creatorName}</span>}
            <span>{formatTime(event.received_at)}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-700/50 bg-gray-850 px-4 py-4 pl-11 space-y-4">
          {/* Recording details */}
          {recording && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recording</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailField label="Title" value={recordingTitle} href={appUrl} />
                <DetailField label="Type" value={recordingType} />
                <DetailField label="ID" value={recording.id} />
                <DetailField label="Status" value={recording.status} />
                <DetailField label="Bucket" value={recording.bucket?.name} />
                <DetailField label="Parent" value={recording.parent?.title || recording.parent?.subject} href={recording.parent?.app_url} />
                <DetailField label="Created" value={recording.created_at ? formatTime(recording.created_at) : null} />
                <DetailField label="Updated" value={recording.updated_at ? formatTime(recording.updated_at) : null} />
              </div>
              {recording.content && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Content</span>
                  <div
                    className="mt-1.5 max-h-64 overflow-auto rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300 prose prose-invert prose-sm max-w-none [&_a]:text-blue-400 [&_a]:underline [&_img]:rounded [&_img]:max-h-48"
                    dangerouslySetInnerHTML={{ __html: recording.content }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Creator details */}
          {creator && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Creator</h4>
              <div className="flex items-center gap-3">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="h-8 w-8 rounded-full shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200">{creator.name || "Unknown"}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500">
                    {creator.id && <span>ID: {creator.id}</span>}
                    {creator.email_address && <span>{creator.email_address}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leave Date */}
          {recording && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Leave Date
                </h4>
                <button
                  onClick={handleFetchLeaveDate}
                  disabled={leaveLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                >
                  {leaveLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    leaveDate ? "Refresh" : "Get Leave Date"
                  )}
                </button>
              </div>
              {creator && (
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-400">
                  <span className="text-gray-500">From:</span>
                  <span className="text-gray-300">{creator.name || "Unknown"}</span>
                  {creator.id && <span className="text-gray-500">ID: {creator.id}</span>}
                  {creator.email_address && <span className="text-gray-500">{creator.email_address}</span>}
                </div>
              )}
              {leaveDate && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <pre className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-mono font-semibold text-gray-100 whitespace-pre-wrap">
                      {leaveDate}
                    </pre>
                    <button
                      onClick={handleCopyDate}
                      className="mt-1.5 shrink-0 rounded-md p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                      title="Copy"
                    >
                      {leaveCopied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <ClipboardCopy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw payload */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors">
              Raw Payload
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-400 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default function WebhooksPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const endpointUrl =
    typeof window !== "undefined"
      ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/webhooks/receive`
      : "";

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks");
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const q = search.toLowerCase();
  const filtered = events.filter((e) => {
    if (!q) return true;
    const kind = (e.kind || "").toLowerCase();
    const title = (e.recording?.title || e.recording?.subject || "").toLowerCase();
    const type = (e.recording?.type || "").toLowerCase();
    const creator = (e.creator?.name || "").toLowerCase();
    return kind.includes(q) || title.includes(q) || type.includes(q) || creator.includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100">
            <Webhook className="h-7 w-7 text-blue-400" />
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Receive events from Basecamp in real time
          </p>
        </div>

        {/* Endpoint URL */}
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-4">
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Payload URL — paste this into Basecamp webhook settings
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-200 font-mono">
              {endpointUrl}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-gray-700 bg-gray-900 p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-750 transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        {!loading && !error && events.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by kind, title, type, or creator..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-gray-700/50 last:border-b-0">
                <div className="h-5 w-16 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/5 rounded bg-gray-700" />
                  <div className="h-3 w-2/5 rounded bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {/* Event log */}
        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="py-16 text-center">
                <Webhook className="mx-auto h-10 w-10 text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">No events received yet.</p>
                <p className="mt-1 text-xs text-gray-500">
                  Copy the URL above into your Basecamp project&apos;s webhook settings.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {filtered.length} event{filtered.length !== 1 ? "s" : ""}
                    {q && ` matching "${search}"`}
                  </span>
                  <span>Auto-refreshes every 30s</span>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden divide-y divide-gray-700/50">
                  {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      No events match your search.
                    </p>
                  ) : (
                    filtered.map((event) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        expanded={expandedId === event.id}
                        onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
