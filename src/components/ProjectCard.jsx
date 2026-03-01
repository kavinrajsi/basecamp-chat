"use client";

import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ProjectCard({ project }) {
  const updated = project.updated_at
    ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {project.name}
        </h3>
        <span
          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            project.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="mb-4 text-sm text-gray-500 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400">
        {updated && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {updated}
          </span>
        )}
        {project.dock && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {project.dock.length} tools
          </span>
        )}
      </div>
    </Link>
  );
}
