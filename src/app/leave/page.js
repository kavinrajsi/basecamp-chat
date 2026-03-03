"use client";

import { useEffect, useState, useMemo } from "react";
import { CalendarDays, User, Search, Calendar, List, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";
import Image from "next/image";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  format, addWeeks, subWeeks, parse,
} from "date-fns";

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gray-700 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 bg-gray-700 rounded w-32" />
              <div className="h-2.5 bg-gray-700 rounded w-24" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 bg-gray-700 rounded w-full" />
            <div className="h-2.5 bg-gray-700 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseAiResponse(text) {
  const leave = [];
  const wfh = [];
  if (!text) return { leave, wfh };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("leave")) {
      const dates = trimmed.replace(/^leave\s*:\s*/, "").split(",").map((d) => d.trim()).filter(Boolean);
      leave.push(...dates);
    } else if (trimmed.startsWith("wfh")) {
      const dates = trimmed.replace(/^wfh\s*:\s*/, "").split(",").map((d) => d.trim()).filter(Boolean);
      wfh.push(...dates);
    }
  }
  return { leave, wfh };
}

function ddmmyyyyToDate(str) {
  try {
    return parse(str, "dd/MM/yyyy", new Date());
  } catch {
    return null;
  }
}

function AICard({ answer }) {
  const { leave, wfh } = parseAiResponse(answer.ai_response);
  if (!leave.length && !wfh.length) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        {answer.creator?.avatar_url ? (
          <Image
            src={answer.creator.avatar_url}
            alt={answer.creator.name}
            width={36}
            height={36}
            className="rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-gray-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{answer.creator?.name}</p>
          <p className="text-xs text-gray-500">{formatDate(answer.created_at)}</p>
        </div>
      </div>
      {leave.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mr-1 self-center">Leave</span>
          {leave.map((d) => (
            <span key={d} className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-300">{d}</span>
          ))}
        </div>
      )}
      {wfh.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mr-1 self-center">WFH</span>
          {wfh.map((d) => (
            <span key={d} className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300">{d}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerCard({ answer }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        {answer.creator?.avatar_url ? (
          <Image
            src={answer.creator.avatar_url}
            alt={answer.creator.name}
            width={36}
            height={36}
            className="rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-gray-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{answer.creator?.name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {formatDate(answer.created_at)}
            </span>
            {answer.creator?.email && (
              <span>{answer.creator.email}</span>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
        {answer.content}
      </p>
      {answer.ai_response && (
        <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2">
          <p className="text-[11px] font-medium text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles size={11} />
            AI Extract
          </p>
          <p className="text-sm font-mono text-gray-200 whitespace-pre-wrap break-all">{answer.ai_response}</p>
        </div>
      )}
    </div>
  );
}

export default function LeavePage() {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aiSubView, setAiSubView] = useState("calendar");
  const [aiSelectedDate, setAiSelectedDate] = useState(new Date());

  useEffect(() => {
    fetch("/api/leave")
      .then((res) => {
        if (res.status === 401) { window.location.href = "/"; return null; }
        if (!res.ok) throw new Error("Failed to load leave data");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setAnswers(data.answers || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = answers.filter((a) =>
    !q ||
    a.creator?.name?.toLowerCase().includes(q) ||
    a.creator?.email?.toLowerCase().includes(q) ||
    (a.content || "").toLowerCase().includes(q) ||
    (a.ai_response || "").toLowerCase().includes(q)
  );

  // Build a date -> answers map for the calendar
  const answersByDate = useMemo(() => {
    const map = new Map();
    for (const a of answers) {
      if (!a.created_at) continue;
      const key = format(new Date(a.created_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return map;
  }, [answers]);

  // Build date -> people map from AI-extracted dates
  const aiByDate = useMemo(() => {
    const map = new Map();
    for (const a of answers) {
      const { leave, wfh } = parseAiResponse(a.ai_response);
      for (const d of leave) {
        const parsed = ddmmyyyyToDate(d);
        if (!parsed) continue;
        const key = format(parsed, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ ...a, type: "leave", dateStr: d });
      }
      for (const d of wfh) {
        const parsed = ddmmyyyyToDate(d);
        if (!parsed) continue;
        const key = format(parsed, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ ...a, type: "wfh", dateStr: d });
      }
    }
    return map;
  }, [answers]);

  const aiWeekDays = eachDayOfInterval({
    start: startOfWeek(aiSelectedDate),
    end: endOfWeek(aiSelectedDate),
  });
  const aiSelectedEntries = aiByDate.get(format(aiSelectedDate, "yyyy-MM-dd")) || [];

  const today = new Date();
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate),
    end: endOfWeek(selectedDate),
  });

  const selectedEntries = answersByDate.get(format(selectedDate, "yyyy-MM-dd")) || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24 overflow-x-hidden">
      <Header title="Leave" />
      <BottomNav />

      {/* Sticky header: toggle + search */}
      <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-800 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex rounded-lg border border-gray-700 overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              <Calendar size={14} />
            </button>
            <button
              onClick={() => setViewMode("ai")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "ai"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {error && <ErrorMessage message={error} />}
        {loading && <Skeleton />}

        {/* Calendar View */}
        {!loading && !error && viewMode === "calendar" && (
          <>
            {/* Month header + Today button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate((d) => subWeeks(d, 1))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-gray-100">
                  {format(selectedDate, "MMM yyyy")}
                </h2>
                <button
                  onClick={() => setSelectedDate((d) => addWeeks(d, 1))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              {!isSameDay(selectedDate, today) && (
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Today
                </button>
              )}
            </div>

            {/* Week strip */}
            <div className="grid grid-cols-7 gap-1 pt-1">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const hasEntries = answersByDate.has(key);
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className="flex flex-col items-center gap-1 py-1"
                  >
                    <span className={`text-[10px] font-medium uppercase ${
                      isSelected ? "text-blue-400" : "text-gray-500"
                    }`}>
                      {format(day, "EEEEE")}
                    </span>
                    <span className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isToday
                          ? "ring-1 ring-blue-500 text-blue-400"
                          : "text-gray-300 hover:bg-gray-800"
                    }`}>
                      {format(day, "d")}
                    </span>
                    {hasEntries && (
                      <span className={`w-1 h-1 rounded-full ${
                        isSelected ? "bg-blue-400" : "bg-gray-500"
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800" />

            {/* Selected date entries */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium">
                {format(selectedDate, "EEEE, MMM d")} — {selectedEntries.length}{" "}
                {selectedEntries.length === 1 ? "response" : "responses"}
              </p>
              {selectedEntries.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">No leaves on this day.</p>
              )}
              {selectedEntries.map((answer) => (
                <AnswerCard key={answer.id} answer={answer} />
              ))}
            </div>
          </>
        )}

        {/* List View */}
        {!loading && !error && viewMode === "list" && (
          <>
            <p className="text-xs text-gray-500">
              {filtered.length} {filtered.length === 1 ? "response" : "responses"}
              {search && ` for "${search}"`}
            </p>

            {filtered.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-12">No responses found.</p>
            )}

            {filtered.map((answer) => (
              <AnswerCard key={answer.id} answer={answer} />
            ))}
          </>
        )}

        {/* AI View */}
        {!loading && !error && viewMode === "ai" && (
          <>
            {/* Sub-toggle: list / calendar */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-700 overflow-hidden">
                <button
                  onClick={() => setAiSubView("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    aiSubView === "list"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <List size={14} />
                  List
                </button>
                <button
                  onClick={() => setAiSubView("calendar")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    aiSubView === "calendar"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Calendar size={14} />
                  Calendar
                </button>
              </div>
              <span className="flex items-center gap-1 text-xs text-purple-400">
                <Sparkles size={12} />
                AI Extracted
              </span>
            </div>

            {/* AI List View */}
            {aiSubView === "list" && (
              <>
                <p className="text-xs text-gray-500">
                  {filtered.filter((a) => a.ai_response).length} entries with AI data
                  {search && ` for "${search}"`}
                </p>
                {filtered.filter((a) => a.ai_response).length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-12">No AI-extracted data found.</p>
                )}
                <div className="space-y-3">
                  {filtered.filter((a) => a.ai_response).map((answer) => (
                    <AICard key={answer.id} answer={answer} />
                  ))}
                </div>
              </>
            )}

            {/* AI Calendar View */}
            {aiSubView === "calendar" && (
              <>
                {/* Month header + Today */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAiSelectedDate((d) => subWeeks(d, 1))}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-100">
                      {format(aiSelectedDate, "MMM yyyy")}
                    </h2>
                    <button
                      onClick={() => setAiSelectedDate((d) => addWeeks(d, 1))}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  {!isSameDay(aiSelectedDate, today) && (
                    <button
                      onClick={() => setAiSelectedDate(new Date())}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Week strip */}
                <div className="grid grid-cols-7 gap-1 pt-1">
                  {aiWeekDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const entries = aiByDate.get(key) || [];
                    const hasLeave = entries.some((e) => e.type === "leave");
                    const hasWfh = entries.some((e) => e.type === "wfh");
                    const isToday = isSameDay(day, today);
                    const isSelected = isSameDay(day, aiSelectedDate);

                    return (
                      <button
                        key={key}
                        onClick={() => setAiSelectedDate(day)}
                        className="flex flex-col items-center gap-1 py-1"
                      >
                        <span className={`text-[10px] font-medium uppercase ${
                          isSelected ? "text-purple-400" : "text-gray-500"
                        }`}>
                          {format(day, "EEEEE")}
                        </span>
                        <span className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                          isSelected
                            ? "bg-purple-600 text-white"
                            : isToday
                              ? "ring-1 ring-purple-500 text-purple-400"
                              : "text-gray-300 hover:bg-gray-800"
                        }`}>
                          {format(day, "d")}
                        </span>
                        <div className="flex gap-0.5">
                          {hasLeave && <span className="w-1 h-1 rounded-full bg-red-400" />}
                          {hasWfh && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-gray-800" />

                {/* Selected date entries */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium">
                    {format(aiSelectedDate, "EEEE, MMM d")} — {aiSelectedEntries.length}{" "}
                    {aiSelectedEntries.length === 1 ? "person" : "people"}
                  </p>
                  {aiSelectedEntries.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8">No leave or WFH on this day.</p>
                  )}
                  {aiSelectedEntries.map((entry) => (
                    <div key={`${entry.id}-${entry.type}-${entry.dateStr}`} className="bg-gray-800 rounded-xl p-3 border border-gray-700 flex items-center gap-3">
                      {entry.creator?.avatar_url ? (
                        <Image
                          src={entry.creator.avatar_url}
                          alt={entry.creator.name}
                          width={32}
                          height={32}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-gray-400" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-white flex-1 truncate">{entry.creator?.name}</p>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        entry.type === "leave"
                          ? "bg-red-500/10 border border-red-500/20 text-red-300"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                      }`}>
                        {entry.type === "leave" ? "Leave" : "WFH"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
