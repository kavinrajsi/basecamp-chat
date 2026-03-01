"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Header from "@/components/Header";
import ProjectDetail from "@/components/ProjectDetail";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProject() {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/projects/${id}`);
        if (!cancelled) setProject(response.data);
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            window.location.href = "/";
          } else {
            setError(err.response?.data?.error || "Failed to load project");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProject();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {!loading && !error && project && <ProjectDetail project={project} />}
      </main>
    </div>
  );
}
