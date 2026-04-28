"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "@phosphor-icons/react";
import { useCookiePreferences } from "@/hooks/useCookiePreferences";

export function CookieConsent() {
  const { prefs, hydrated, update } = useCookiePreferences();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (prefs) return;

    if (typeof document !== "undefined") {
      const gpc = document.querySelector('meta[name="x-gpc-signal"]')?.getAttribute("content");
      if (gpc === "1") {
        update({ analytics: false, gpc: true });
        return;
      }
    }

    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [hydrated, prefs, update]);

  if (!visible) return null;

  const acceptAll = () => {
    update({ analytics: true });
    setVisible(false);
  };

  const acceptEssentialOnly = () => {
    update({ analytics: false });
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] lg:pb-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-[var(--primary)] shrink-0" weight="duotone" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Cookie Preferences</p>
            </div>
            <button
              onClick={acceptEssentialOnly}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Dismiss cookie banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            We use essential cookies for authentication and core functionality. With your consent,
            we also use analytics cookies to understand how you use BackRow.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={acceptAll}
              className="flex-1 h-8 text-xs font-medium rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={acceptEssentialOnly}
              className="flex-1 h-8 text-xs font-medium rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Essential Only
            </button>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] text-center space-x-2">
            <Link
              href="/cookie-settings"
              className="underline hover:text-[var(--text-secondary)] transition-colors"
            >
              Manage preferences
            </Link>
            <span>·</span>
            <Link
              href="/privacy-policy"
              className="underline hover:text-[var(--text-secondary)] transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
