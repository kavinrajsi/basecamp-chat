"use client";

import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ProjectGrid from "@/components/ProjectGrid";
import ProjectList from "@/components/ProjectList";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import useProjects from "@/hooks/useProjects";
import useProjectStore from "@/store/useProjectStore";

export default function DashboardPage() {
  const { loading, error } = useProjects();
  const viewMode = useProjectStore((s) => s.viewMode);
  const getFilteredProjects = useProjectStore((s) => s.getFilteredProjects);
  const filteredProjects = getFilteredProjects();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Projects</h1>
        <FilterBar />

        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && (
          <>
            {viewMode === "grid" ? (
              <ProjectGrid projects={filteredProjects} />
            ) : (
              <ProjectList projects={filteredProjects} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
