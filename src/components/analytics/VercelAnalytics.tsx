"use client";

import { Analytics } from "@vercel/analytics/react";
import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "backrow-cookie-consent";

function getAnalyticsConsent(): boolean {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

export function VercelAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    setHasConsent(getAnalyticsConsent());

    const handleConsentUpdate = () => {
      setHasConsent(getAnalyticsConsent());
    };

    window.addEventListener("cookie-consent-updated", handleConsentUpdate);
    return () => window.removeEventListener("cookie-consent-updated", handleConsentUpdate);
  }, []);

  if (!hasConsent) return null;

  return <Analytics />;
}
