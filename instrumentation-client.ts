import * as Sentry from "@sentry/browser";

// Client-side Sentry. @sentry/nextjs was removed repo-wide because its
// transitive OpenTelemetry chain (import-in-the-middle /
// require-in-the-middle) was being traced into the server bundle by
// Turbopack, producing hash-suffixed externals that fail at runtime on
// Vercel Functions. @sentry/browser is the browser-only subset.
// Upstream context: vercel/next.js#64022 / #87737.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});
