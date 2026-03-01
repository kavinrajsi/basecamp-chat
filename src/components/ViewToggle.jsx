"use client";

import { LayoutGrid, List } from "lucide-react";
import useProjectStore from "@/store/useProjectStore";

export default function ViewToggle() {
  const viewMode = useProjectStore((s) => s.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);

  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
      <button
        onClick={() => setViewMode("grid")}
        className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
          viewMode === "grid"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
          viewMode === "list"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
