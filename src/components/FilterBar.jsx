"use client";

import useProjectStore from "@/store/useProjectStore";
import SearchBar from "./SearchBar";
import SortSelect from "./SortSelect";
import ViewToggle from "./ViewToggle";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export default function FilterBar() {
  const statusFilter = useProjectStore((s) => s.statusFilter);
  const setStatusFilter = useProjectStore((s) => s.setStatusFilter);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <SearchBar />
        </div>
        <div className="flex items-center gap-3">
          <SortSelect />
          <ViewToggle />
        </div>
      </div>
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === option.value
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
