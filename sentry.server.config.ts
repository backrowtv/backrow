// Intentionally empty. Server-side Sentry is disabled because
// @sentry/nextjs pulls in OpenTelemetry + import-in-the-middle /
// require-in-the-middle, which Turbopack hash-wraps in its externalRequire
// helper and fails at runtime on Vercel Functions. See instrumentation.ts
// for the full rationale. Upstream: vercel/next.js#64022.
//
// Client-side Sentry in sentry.client.config.ts is untouched.
export {};
