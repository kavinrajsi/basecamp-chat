"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mountain, LogOut } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.identity) setUser(data.identity);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">
            Basecamp Viewer
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.first_name} {user.last_name}
            </span>
            <a
              href="/api/auth/logout"
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
