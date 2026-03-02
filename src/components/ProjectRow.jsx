"use client";

import Link from "next/link";
import { format, differenceInDays, startOfDay } from "date-fns";

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-red-500",
  "bg-amber-500",
  "bg-pink-600",
  "bg-indigo-500",
  "bg-teal-600",
  "bg-cyan-600",
  "bg-rose-500",
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = differenceInDays(startOfDay(now), startOfDay(date));
  if (diffDays === 0) return format(date, "h:mm a");
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return format(date, "EEE");
  return format(date, "M/d/yy");
}

export default function ProjectRow({ project }) {
  const avatarColor = getAvatarColor(project.name);
  const initials = getInitials(project.name);
  const time = formatTime(project.updated_at);
  const isActive = project.status === "active";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 active:bg-gray-800 transition-colors border-b border-gray-700/40 last:border-0"
    >
      {/* Avatar */}
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${avatarColor} text-lg font-bold text-white select-none`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-gray-100">
            {project.name}
          </span>
          <span
            className={`shrink-0 text-xs ${
              isActive ? "text-green-400" : "text-gray-500"
            }`}
          >
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="truncate text-sm text-gray-400">
            {project.description ||
              (isActive ? "Active project" : "Archived project")}
          </p>
          {isActive && (
            <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-green-500" />
          )}
        </div>
      </div>
    </Link>
  );
}
