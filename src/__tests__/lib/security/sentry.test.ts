// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();
vi.mock("@sentry/browser", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { captureExceptionIfConsented } from "@/lib/security/sentry";
import { COOKIE_CONSENT_KEY } from "@/hooks/useCookiePreferences";

afterEach(() => {
  window.localStorage.clear();
  captureException.mockClear();
});

describe("captureExceptionIfConsented", () => {
  it("does NOT forward the error when no preferences are stored (default deny)", () => {
    captureExceptionIfConsented(new Error("nope"));
    expect(captureException).not.toHaveBeenCalled();
  });

  it("does NOT forward when analytics consent is false", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ essential: true, analytics: false, timestamp: "x" })
    );
    captureExceptionIfConsented(new Error("nope"));
    expect(captureException).not.toHaveBeenCalled();
  });

  it("forwards when analytics consent is true", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ essential: true, analytics: true, timestamp: "x" })
    );
    const err = new Error("yes");
    captureExceptionIfConsented(err);
    expect(captureException).toHaveBeenCalledWith(err);
  });
});
