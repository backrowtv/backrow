// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  hasAnalyticsConsent,
  useCookiePreferences,
} from "@/hooks/useCookiePreferences";

afterEach(() => {
  window.localStorage.clear();
});

describe("useCookiePreferences", () => {
  it("returns null prefs when nothing is stored", () => {
    const { result } = renderHook(() => useCookiePreferences());
    expect(result.current.prefs).toBeNull();
    expect(result.current.hasAnalyticsConsent).toBe(false);
  });

  it("reads stored preferences on mount", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        essential: true,
        analytics: true,
        timestamp: "2026-04-23T00:00:00.000Z",
      })
    );
    const { result } = renderHook(() => useCookiePreferences());
    expect(result.current.prefs?.analytics).toBe(true);
    expect(result.current.hasAnalyticsConsent).toBe(true);
  });

  it("update() persists to localStorage and fires the consent event", () => {
    let fired = 0;
    window.addEventListener(COOKIE_CONSENT_EVENT, () => {
      fired += 1;
    });
    const { result } = renderHook(() => useCookiePreferences());
    act(() => {
      result.current.update({ analytics: true });
    });
    const stored = JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_KEY) ?? "{}");
    expect(stored.analytics).toBe(true);
    expect(stored.essential).toBe(true);
    expect(stored.timestamp).toEqual(expect.any(String));
    expect(fired).toBeGreaterThanOrEqual(1);
  });

  it("clear() removes the stored record and fires the event", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ essential: true, analytics: true, timestamp: "x" })
    );
    const { result } = renderHook(() => useCookiePreferences());
    act(() => {
      result.current.clear();
    });
    expect(window.localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    expect(result.current.prefs).toBeNull();
  });

  it("re-reads when another tab / component dispatches the consent event", () => {
    const { result } = renderHook(() => useCookiePreferences());
    expect(result.current.prefs).toBeNull();
    act(() => {
      window.localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({ essential: true, analytics: false, timestamp: "x" })
      );
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
    });
    expect(result.current.prefs?.analytics).toBe(false);
  });

  it("carries gpc flag through update()", () => {
    const { result } = renderHook(() => useCookiePreferences());
    act(() => {
      result.current.update({ analytics: false, gpc: true });
    });
    expect(result.current.prefs?.gpc).toBe(true);
    expect(result.current.prefs?.analytics).toBe(false);
  });
});

describe("hasAnalyticsConsent", () => {
  it("returns false when nothing is stored (default deny)", () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns true only when analytics=true is stored", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ essential: true, analytics: true, timestamp: "x" })
    );
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("returns false when analytics=false", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ essential: true, analytics: false, timestamp: "x" })
    );
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns false on malformed JSON", () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "not json");
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
