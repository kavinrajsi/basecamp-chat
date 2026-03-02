"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Users, ListTodo, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Projects", icon: FolderOpen },
  { href: "/users", label: "Users", icon: Users },
  { href: "/todo-list", label: "Todos", icon: ListTodo },
  { href: "/ai", label: "AI", icon: Sparkles },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-700/80 bg-gray-900/95 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          const isAI = href === "/ai";
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-colors ${
                isActive
                  ? isAI
                    ? "text-purple-400"
                    : "text-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon
                className={`h-6 w-6 transition-transform ${isActive ? "scale-110" : ""}`}
              />
              <span
                className={`text-[10px] font-medium tracking-wide ${
                  isActive ? (isAI ? "text-purple-400" : "text-blue-400") : "text-gray-500"
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
