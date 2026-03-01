"use client";

import ProjectRow from "./ProjectRow";

export default function ProjectList({ projects }) {
  if (projects.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No projects found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}
    </div>
  );
}
