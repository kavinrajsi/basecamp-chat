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

  async function fetchProject() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        window.location.href = "/";
      } else {
        setError(err.response?.data?.error || "Failed to load project");
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshChat() {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
    } catch {
      // silent refresh failure
    }
  }

  useEffect(() => {
    fetchProject();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hide header on mobile — ProjectDetail has its own mobile header */}
      <div className="hidden sm:block">
        <Header />
      </div>
      <main className="sm:mx-auto sm:max-w-4xl sm:px-6 sm:py-8 lg:px-8">
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {!loading && !error && project && (
          <ProjectDetail project={project} onMessageSent={refreshChat} />
        )}
      </main>
    </div>
  );
}
