"use client";

import ProjectCard from "./ProjectCard";

export default function ProjectGrid({ projects }) {
  if (projects.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        No projects found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
