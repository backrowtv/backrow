"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "@phosphor-icons/react";

const COOKIE_CONSENT_KEY = "backrow-cookie-consent";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  timestamp: string;
}

function getStoredPreferences(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("cookie-consent-updated"));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Only show if no stored preferences
    const prefs = getStoredPreferences();
    if (!prefs) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    });
    setVisible(false);
  };

  const acceptEssentialOnly = () => {
    savePreferences({
      essential: true,
      analytics: false,
      timestamp: new Date().toISOString(),
    });
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg p-4 space-y-3">
          {/* Header row */}
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

          {/* Description */}
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            We use essential cookies for authentication and core functionality. With your consent,
            we also use analytics cookies to understand how you use BackRow.
          </p>

          {/* Details toggle */}
          {showDetails && (
            <div className="space-y-2 text-xs border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Essential</p>
                  <p className="text-[var(--text-muted)]">Authentication, sessions, preferences</p>
                </div>
                <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                  Always on
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Analytics</p>
                  <p className="text-[var(--text-muted)]">Usage patterns, page views</p>
                </div>
                <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                  Optional
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
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
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="h-8 px-3 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showDetails ? "Less" : "More"}
            </button>
          </div>

          {/* Privacy link */}
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            Learn more in our{" "}
            <a
              href="/privacy-policy"
              className="underline hover:text-[var(--text-secondary)] transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
