import { initBotId } from "botid/client/core";
import * as Sentry from "@sentry/nextjs";

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
