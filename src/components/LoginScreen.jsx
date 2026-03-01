"use client";

import { Mountain } from "lucide-react";

export default function LoginScreen() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-100 p-3">
            <Mountain className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Basecamp Viewer
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Sign in to view and manage your Basecamp projects
        </p>
        <a
          href="/api/auth/login"
          className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Sign in with Basecamp
        </a>
      </div>
    </div>
  );
}
