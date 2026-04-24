"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useCookiePreferences } from "@/hooks/useCookiePreferences";

export function CookieSettingsForm() {
  const { prefs, hydrated, update, clear } = useCookiePreferences();
  const [analytics, setAnalytics] = useState(false);
  const [saved, setSaved] = useState<null | "saved" | "cleared">(null);

  useEffect(() => {
    if (hydrated) setAnalytics(prefs?.analytics === true);
  }, [hydrated, prefs?.analytics]);

  const save = () => {
    update({ analytics, gpc: prefs?.gpc });
    setSaved("saved");
  };

  const reset = () => {
    clear();
    setAnalytics(false);
    setSaved("cleared");
  };

  return (
    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
      <div className="flex items-center justify-between py-4">
        <div className="pr-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">Essential</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Sign-in, session, and security. Required to use BackRow.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Always on
        </span>
      </div>

      <div className="flex items-center justify-between py-4">
        <label htmlFor="analytics-toggle" className="pr-4 cursor-pointer">
          <p className="text-sm font-medium text-[var(--text-primary)]">Analytics</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Aggregated usage patterns that help us prioritize features and detect errors. Off by
            default; we only capture these when you opt in.
          </p>
        </label>
        <Switch
          id="analytics-toggle"
          checked={analytics}
          onCheckedChange={(next) => {
            setAnalytics(next);
            setSaved(null);
          }}
        />
      </div>

      {prefs?.gpc && (
        <div className="py-4">
          <p className="text-xs text-[var(--text-muted)]">
            Your browser sent a Global Privacy Control signal on a recent visit, so analytics
            started off.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-4">
        <button
          type="button"
          onClick={save}
          className="h-9 px-4 text-sm font-medium rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors"
        >
          Save preferences
        </button>
        <button
          type="button"
          onClick={reset}
          className="h-9 px-4 text-sm font-medium rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Reset
        </button>
        {saved === "saved" && (
          <span className="text-xs text-[var(--text-muted)]">Preferences saved.</span>
        )}
        {saved === "cleared" && (
          <span className="text-xs text-[var(--text-muted)]">
            Preferences cleared. The banner will reappear on your next visit.
          </span>
        )}
      </div>

      <div className="py-4 text-xs text-[var(--text-muted)] space-x-3">
        <Link href="/privacy-policy" className="underline">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/do-not-sell-or-share" className="underline">
          Do Not Sell or Share My Personal Information
        </Link>
      </div>
    </div>
  );
}
