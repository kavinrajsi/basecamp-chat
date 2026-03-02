import { create } from "zustand";

const useProjectStore = create((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  viewMode: "list", // "grid" | "list"
  statusFilter: "active", // "active" | "archived" | "all"
  searchQuery: "",
  sortBy: "updated", // "name" | "created" | "updated"

  setProjects: (projects) => set({ projects }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setViewMode: (viewMode) => set({ viewMode }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortBy: (sortBy) => set({ sortBy }),

  getFilteredProjects: () => {
    const { projects, statusFilter, searchQuery, sortBy } = get();

    let filtered = [...projects];

    // Filter by status
    if (statusFilter === "active") {
      filtered = filtered.filter((p) => p.status === "active");
    } else if (statusFilter === "archived") {
      filtered = filtered.filter((p) => p.status === "archived");
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "created":
          return new Date(b.created_at) - new Date(a.created_at);
        case "updated":
        default:
          return new Date(b.updated_at) - new Date(a.updated_at);
      }
    });

    return filtered;
  },
}));

export default useProjectStore;
