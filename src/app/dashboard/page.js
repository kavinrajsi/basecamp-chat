"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProjectGrid from "@/components/ProjectGrid";
import ProjectList from "@/components/ProjectList";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import SearchBar from "@/components/SearchBar";
import ViewToggle from "@/components/ViewToggle";
import SortSelect from "@/components/SortSelect";
import useProjects from "@/hooks/useProjects";
import useProjectStore from "@/store/useProjectStore";

const STATUS_TABS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export default function DashboardPage() {
  const { loading, error } = useProjects();
  const viewMode = useProjectStore((s) => s.viewMode);
  const getFilteredProjects = useProjectStore((s) => s.getFilteredProjects);
  const statusFilter = useProjectStore((s) => s.statusFilter);
  const setStatusFilter = useProjectStore((s) => s.setStatusFilter);
  const filteredProjects = getFilteredProjects();

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <BottomNav />
      <main className="mx-auto max-w-2xl px-0 sm:px-4 sm:py-6 pb-20">
        {/* Page header */}
        <div className="px-4 pt-5 pb-3 sm:px-0">
          <SearchBar />
        </div>

        {loading && (
          <div className="px-4 sm:px-0">
            <LoadingSpinner />
          </div>
        )}
        {error && (
          <div className="px-4 sm:px-0">
            <ErrorMessage message={error} />
          </div>
        )}
        {!loading && !error && (
          <div className="sm:rounded-2xl overflow-hidden">
            {viewMode === "grid" ? (
              <div className="px-4 sm:px-0">
                <ProjectGrid projects={filteredProjects} />
              </div>
            ) : (
              <ProjectList projects={filteredProjects} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
