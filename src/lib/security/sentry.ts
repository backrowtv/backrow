import * as Sentry from "@sentry/browser";
import { hasAnalyticsConsent } from "@/hooks/useCookiePreferences";

export function captureExceptionIfConsented(error: unknown) {
  if (!hasAnalyticsConsent()) return;
  Sentry.captureException(error);
}
