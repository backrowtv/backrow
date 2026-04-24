import * as Sentry from "@sentry/browser";
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent } from "@/hooks/useCookiePreferences";

// Client-side Sentry. @sentry/nextjs was removed repo-wide because its
// transitive OpenTelemetry chain (import-in-the-middle /
// require-in-the-middle) was being traced into the server bundle by
// Turbopack, producing hash-suffixed externals that fail at runtime on
// Vercel Functions. @sentry/browser is the browser-only subset.
// Upstream context: vercel/next.js#64022 / #87737.
//
// Init is gated on analytics consent (GDPR/CCPA). Session replay and
// traces count as analytics/tracking, so we only init Sentry when the
// user has explicitly opted in. If consent is granted mid-session, we
// init on the cookie-consent-updated event.

let initialized = false;

function initSentryIfConsented() {
  if (initialized) return;
  if (!hasAnalyticsConsent()) return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
  initialized = true;
}

initSentryIfConsented();

if (typeof window !== "undefined") {
  window.addEventListener(COOKIE_CONSENT_EVENT, initSentryIfConsented);
}
