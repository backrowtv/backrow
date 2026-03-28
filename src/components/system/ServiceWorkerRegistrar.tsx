"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once on mount for authenticated users.
 * Required for Web Push delivery — the service worker handles push events
 * even when BackRow is not open.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent — registration failure shouldn't break the app
    });
  }, []);
  return null;
}
