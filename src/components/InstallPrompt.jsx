"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Don't show if dismissed within the last 7 days
    const dismissed = localStorage.getItem("pwa-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // iOS Safari detection
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari =
      /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);

    if (isIOSDevice && isSafari) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time browser detection on mount
      setIsIOS(true);
      setShow(true);
      return;
    }

    // Chrome / Android — wait for browser's install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 rounded-2xl bg-gray-800 border border-gray-700 p-4 shadow-2xl">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 p-1"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-green-700 flex items-center justify-center flex-shrink-0 text-xl">
          ⛺
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-white leading-tight">Install Basecamp Viewer</p>
          {isIOS ? (
            <p className="text-xs text-gray-400 mt-0.5">
              Tap <Share size={11} className="inline mb-0.5" />{" "}
              <span className="text-gray-300">Share</span> → <Plus size={11} className="inline mb-0.5" />{" "}
              <span className="text-gray-300">Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Add to home screen for quick access</p>
          )}
        </div>

        {/* Install button (non-iOS only) */}
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="flex-shrink-0 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
