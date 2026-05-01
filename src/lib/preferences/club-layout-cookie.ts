import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

// Cookie that mirrors a member's club-page layout prefs into a path-scoped
// cookie so loading.tsx (which can't reach the DB on the critical path) can
// skip skeletons for sections the user has hidden.
//
// Path scoping (`/club/{slug}`) means each club gets its own cookie and the
// right one is automatically selected for the current route — no slug
// parsing in loading.tsx required.
//
// Bootstrapping: page.tsx calls syncClubLayoutCookie() after reading the DB
// pref, so existing-pref users get the cookie populated on first visit.
// Subsequent visits are skeleton-accurate.

export const COOKIE_NAME = "bk_clublayout";

export interface ClubLayoutPrefs {
  idCardDesktop: boolean;
  idCardMobile: boolean;
}

const DEFAULT: ClubLayoutPrefs = { idCardDesktop: false, idCardMobile: false };

const ONE_YEAR = 60 * 60 * 24 * 365;

export function readClubLayoutCookie(jar: ReadonlyRequestCookies): ClubLayoutPrefs {
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return DEFAULT;
  try {
    const parsed = JSON.parse(raw) as Partial<ClubLayoutPrefs>;
    return {
      idCardDesktop: parsed.idCardDesktop === true,
      idCardMobile: parsed.idCardMobile === true,
    };
  } catch {
    return DEFAULT;
  }
}

export async function writeClubLayoutCookie(slug: string, layout: ClubLayoutPrefs): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, JSON.stringify(layout), {
    path: `/club/${slug}`,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
  });
}

/** Write the cookie only if the desired layout differs from what's stored. */
export async function syncClubLayoutCookie(slug: string, desired: ClubLayoutPrefs): Promise<void> {
  const jar = await cookies();
  const current = readClubLayoutCookie(jar);
  if (
    current.idCardDesktop === desired.idCardDesktop &&
    current.idCardMobile === desired.idCardMobile
  ) {
    return;
  }
  jar.set(COOKIE_NAME, JSON.stringify(desired), {
    path: `/club/${slug}`,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
  });
}
