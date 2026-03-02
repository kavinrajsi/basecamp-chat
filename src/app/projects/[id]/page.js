"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Clock } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProjectDetail from "@/components/ProjectDetail";
import ProjectDetailSkeleton from "@/components/ProjectDetailSkeleton";
import ErrorMessage from "@/components/ErrorMessage";

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(null);
  const countdownRef = useRef(null);

  const startCountdown = useCallback((seconds, onDone) => {
    setRateLimitCountdown(seconds);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          onDone();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRateLimitCountdown(null);
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        window.location.href = "/";
      } else if (err.response?.status === 429) {
        const wait = err.response.data?.retryAfter ?? 10;
        startCountdown(wait, fetchProject);
      } else {
        setError(err.response?.data?.error || "Failed to load project");
      }
    } finally {
      setLoading(false);
    }
  }, [id, startCountdown]);

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
  }, [id, fetchProject]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hide header on mobile — ProjectDetail has its own mobile header */}
      <div className="hidden sm:block">
        <Header />
      </div>
      <BottomNav />

      {/* Rate limit toast */}
      {rateLimitCountdown !== null && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 w-max max-w-[90vw]">
          <div className="flex items-center gap-3 rounded-xl border border-amber-700/50 bg-amber-900/90 px-4 py-3 shadow-lg backdrop-blur-sm text-sm text-amber-200">
            <Clock className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Rate limited — retrying in <span className="font-bold tabular-nums">{rateLimitCountdown}s</span></span>
          </div>
        </div>
      )}

      <main className="sm:mx-auto sm:max-w-4xl sm:px-6 sm:py-8 lg:px-8">
        {loading && <ProjectDetailSkeleton />}
        {error && <ErrorMessage message={error} />}
        {!loading && !error && project && (
          <ProjectDetail project={project} onMessageSent={refreshChat} currentUserId={project.currentUserId} />
        )}
      </main>
    </div>
  );
}
