import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  beforeSend(event, hint) {
    const original = hint?.originalException;
    if (original && typeof original === "object") {
      const chain: Array<Record<string, unknown>> = [];
      let current: unknown = original;
      for (let i = 0; i < 5 && current && typeof current === "object"; i++) {
        const c = current as {
          message?: unknown;
          name?: unknown;
          code?: unknown;
          cause?: unknown;
          stack?: unknown;
        };
        chain.push({
          message: c.message,
          name: c.name,
          code: c.code,
          stack:
            typeof c.stack === "string" ? c.stack.split("\n").slice(0, 20).join("\n") : undefined,
        });
        current = c.cause;
      }
      event.contexts = {
        ...event.contexts,
        error_details: { chain },
      };
    }
    return event;
  },
});
