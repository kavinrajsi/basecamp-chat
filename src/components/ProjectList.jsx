"use client";

import ProjectRow from "./ProjectRow";

export default function ProjectList({ projects }) {
  if (projects.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        No projects found.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}
    </div>
  );
}
