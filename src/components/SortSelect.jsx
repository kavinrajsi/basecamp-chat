"use client";

import { ArrowUpDown } from "lucide-react";
import useProjectStore from "@/store/useProjectStore";

export default function SortSelect() {
  const sortBy = useProjectStore((s) => s.sortBy);
  const setSortBy = useProjectStore((s) => s.setSortBy);

  return (
    <div className="relative flex items-center">
      <ArrowUpDown className="absolute left-3 h-4 w-4 text-gray-500 pointer-events-none" />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-9 pr-8 text-sm text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="updated">Last Updated</option>
        <option value="created">Date Created</option>
        <option value="name">Name</option>
      </select>
    </div>
  );
}
