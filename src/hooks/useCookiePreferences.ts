"use client";

import { useCallback, useEffect, useState } from "react";

export interface CookiePreferences {
  essential: true;
  analytics: boolean;
  timestamp: string;
  gpc?: boolean;
}

export const COOKIE_CONSENT_KEY = "backrow-cookie-consent";
export const COOKIE_CONSENT_EVENT = "cookie-consent-updated";

function read(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return raw ? (JSON.parse(raw) as CookiePreferences) : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  const prefs = read();
  return prefs?.analytics === true;
}

export function useCookiePreferences() {
  const [prefs, setPrefs] = useState<CookiePreferences | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(read());
    setHydrated(true);
    const handler = () => setPrefs(read());
    window.addEventListener(COOKIE_CONSENT_EVENT, handler);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handler);
  }, []);

  const update = useCallback(
    (next: Omit<CookiePreferences, "timestamp" | "essential"> & { essential?: true }) => {
      const record: CookiePreferences = {
        essential: true,
        analytics: next.analytics,
        gpc: next.gpc,
        timestamp: new Date().toISOString(),
      };
      window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
    },
    []
  );

  const clear = useCallback(() => {
    window.localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
  }, []);

  return {
    prefs,
    hydrated,
    update,
    clear,
    hasAnalyticsConsent: prefs?.analytics === true,
  };
}
