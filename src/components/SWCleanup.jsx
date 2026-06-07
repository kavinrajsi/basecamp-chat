"use client";

import { useEffect } from "react";

// The app previously shipped a service worker (offline mode). This component
// unregisters any still-installed worker and clears its caches so stale cached
// pages and API responses stop being served. Safe to remove once all clients
// have loaded the app at least once after the offline feature was removed.
export default function SWCleanup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => caches.delete(k)))
        .catch(() => {});
    }
  }, []);

  return null;
}
