"use client";

import { format } from "date-fns";
import { Calendar, Users, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function ProjectDetail({ project }) {
  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              project.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className="mb-6 text-gray-600">{project.description}</p>
        )}

        <div className="mb-6 flex flex-wrap gap-6 text-sm text-gray-500">
          {project.created_at && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Created {format(new Date(project.created_at), "MMM d, yyyy")}
            </div>
          )}
          {project.updated_at && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Updated {format(new Date(project.updated_at), "MMM d, yyyy")}
            </div>
          )}
          {project.app_url && (
            <a
              href={project.app_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Basecamp
            </a>
          )}
        </div>

        {/* Tools / Dock */}
        {project.dock && project.dock.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Tools</h2>
            <div className="flex flex-wrap gap-2">
              {project.dock
                .filter((d) => d.enabled)
                .map((tool) => (
                  <span
                    key={tool.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {tool.title}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* People */}
        {project.people && project.people.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Users className="h-4 w-4" />
              Team ({project.people.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.people.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                      {person.name?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {person.name}
                    </p>
                    {person.email_address && (
                      <p className="truncate text-xs text-gray-500">
                        {person.email_address}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
