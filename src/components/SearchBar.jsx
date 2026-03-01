"use client";

import { Search } from "lucide-react";
import useProjectStore from "@/store/useProjectStore";

export default function SearchBar() {
  const searchQuery = useProjectStore((s) => s.searchQuery);
  const setSearchQuery = useProjectStore((s) => s.setSearchQuery);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
