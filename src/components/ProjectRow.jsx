"use client";

import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ProjectRow({ project }) {
  const updated = project.updated_at
    ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 transition-all hover:border-blue-300 hover:shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              project.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {project.status}
          </span>
        </div>
        {project.description && (
          <p className="mt-1 truncate text-sm text-gray-500">
            {project.description}
          </p>
        )}
      </div>

      <div className="ml-4 flex items-center gap-4 shrink-0">
        {updated && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            {updated}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
      </div>
    </Link>
  );
}
