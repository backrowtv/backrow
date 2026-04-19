import { initBotId } from "botid/client/core";
import * as Sentry from "@sentry/browser";

// Protected server-action surfaces. Server-side enforcement via
// `requireHuman()` / `checkBotId()` in the relevant action files.
initBotId({
  protect: [
    { path: "/sign-up", method: "POST" },
    { path: "/sign-in", method: "POST" },
    { path: "/feedback", method: "POST" },
    { path: "/contact", method: "POST" },
    { path: "/clubs/new", method: "POST" },
    { path: "/clubs/*", method: "POST" },
  ],
});

// Client-side Sentry. Replaces the previous sentry.client.config.ts +
// @sentry/nextjs setup because @sentry/nextjs' transitive deps
// (@opentelemetry/instrumentation → import-in-the-middle /
// require-in-the-middle) were still being traced into the server bundle
// by Turbopack, producing hash-suffixed externals that fail at runtime.
// Upstream: vercel/next.js#64022 / #87737.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});
