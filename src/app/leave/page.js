"use client";

import { useEffect, useState } from "react";
import { CalendarDays, User } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorMessage from "@/components/ErrorMessage";
import Image from "next/image";

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

export default function LeavePage() {
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

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

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <Header title="Leave" />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Question title */}
        {question && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Check-in question</p>
            <p className="text-sm font-semibold text-white">{question.title}</p>
            {question.schedule?.frequency && (
              <p className="text-xs text-gray-500 mt-1 capitalize">{question.schedule.frequency}</p>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
        </div>

        {/* Count */}
        {!loading && !error && (
          <p className="text-xs text-gray-500">
            {filtered.length} {filtered.length === 1 ? "response" : "responses"}
            {search && ` for "${search}"`}
          </p>
        )}

        {/* Content */}
        {error && <ErrorMessage message={error} />}
        {loading && <Skeleton />}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-12">No responses found.</p>
        )}

        {!loading && !error && filtered.map((answer) => (
          <div key={answer.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            {/* Person + date */}
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

            {/* Answer content */}
            <div
              className="text-sm text-gray-300 leading-relaxed prose-sm prose-invert"
              dangerouslySetInnerHTML={{ __html: answer.content }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
