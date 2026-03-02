"use client";

import { useEffect, useState, useMemo } from "react";
import { CalendarDays, User, Search, Calendar, List, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";
import Image from "next/image";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  format, addWeeks, subWeeks,
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
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{answer.creator?.name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <CalendarDays size={11} />
            <span>{formatDate(answer.created_at)}</span>
          </div>
        </div>
      </div>
      <div
        className="text-sm text-gray-300 leading-relaxed prose prose-sm prose-invert max-w-none break-words overflow-hidden [&_a]:text-blue-400 [&_a]:underline [&_a]:break-all [&_img]:max-w-full [&_img]:rounded-md [&_figure]:my-1 [&_figcaption]:text-xs [&_figcaption]:text-gray-400 [&_bc-attachment]:inline-flex [&_bc-attachment]:items-center [&_bc-attachment]:gap-1 [&_bc-attachment]:align-middle [&_bc-attachment]:mr-1.5 [&_bc-attachment_figure]:m-0 [&_bc-attachment_figure]:p-0 [&_bc-attachment_figure]:inline-flex [&_bc-attachment_figure]:items-center [&_bc-attachment_figure]:gap-1 [&_bc-attachment_img]:h-5 [&_bc-attachment_img]:w-5 [&_bc-attachment_img]:rounded-full [&_bc-attachment_img]:object-cover [&_bc-attachment_img]:max-h-5 [&_bc-attachment_figcaption]:inline [&_bc-attachment_figcaption]:text-xs [&_bc-attachment_figcaption]:text-blue-400 [&_bc-attachment_figcaption]:font-medium"
        dangerouslySetInnerHTML={{ __html: answer.content }}
      />
    </div>
  );
}

export default function LeavePage() {
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetch("/api/leave")
      .then((res) => {
        if (res.status === 401) { window.location.href = "/"; return null; }
        if (!res.ok) throw new Error("Failed to load leave data");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setQuestion(data.question);
        setAnswers(data.answers);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = answers.filter((a) =>
    !q ||
    a.creator?.name?.toLowerCase().includes(q) ||
    stripHtml(a.content).toLowerCase().includes(q)
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles size={32} className="text-blue-400 mb-3" />
            <p className="text-sm font-medium text-gray-200">AI Summary</p>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
