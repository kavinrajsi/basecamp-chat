"use client";

import { useEffect } from "react";
import axios from "axios";
import useProjectStore from "@/store/useProjectStore";

export default function useProjects() {
  const { setProjects, setLoading, setError, loading, error } =
    useProjectStore();

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get("/api/projects");
        if (!cancelled) {
          setProjects(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            window.location.href = "/";
          } else {
            setError(
              err.response?.data?.error || "Failed to fetch projects"
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [setProjects, setLoading, setError]);

  return { loading, error };
}
