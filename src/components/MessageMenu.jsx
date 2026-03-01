"use client";

import { useState, useRef, useEffect } from "react";
import { Link2, Trash2, MoreHorizontal } from "lucide-react";

const menuItems = [
  { key: "copy-link", label: "Copy link", icon: Link2 },
  { key: "delete", label: "Delete", icon: Trash2, danger: true },
];

export default function MessageMenu({ onAction }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-700 hover:text-gray-300"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg bg-blue-400 shadow-lg">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setOpen(false);
                onAction?.(item.key);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-blue-500 ${
                item.danger ? "text-gray-900" : "text-gray-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
