"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Users, Webhook } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Projects", icon: FolderOpen },
  { href: "/users", label: "Users", icon: Users },
  { href: "/webhooks", label: "Hooks", icon: Webhook, adminOnly: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.isAdmin) setAdmin(true); })
      .catch(() => {});
  }, []);

  // Hide on project detail pages (mobile has its own layout)
  if (pathname.startsWith("/projects/")) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || admin);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-700/80 bg-gray-900/95 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon
                className={`h-6 w-6 transition-transform ${isActive ? "scale-110" : ""}`}
              />
              <span
                className={`text-[10px] font-medium tracking-wide ${
                  isActive ? "text-blue-400" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
