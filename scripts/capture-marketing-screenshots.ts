/**
 * Marketing landing-page screenshot capture (v2 — clip-based, no DOM mutation).
 *
 * Strategy:
 *   1. Sign in as a demo user (Maya Patel).
 *   2. Hide app chrome via CSS (header/footer/sidebar/profile/cookies/dev overlays).
 *   3. Mark the focal element with data-marketing-shot.
 *   4. Read its bounding box, expand it to the target aspect ratio centered on
 *      the element with consistent padding, then page.screenshot({ clip }).
 *
 * No DOM moves — element stays in its natural flex/grid context. Just a clip.
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import { readFileSync } from "node:fs";
import { mkdir as mkdirP } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local synchronously (top-level await not supported by tsx CJS)
function loadEnv() {
  try {
    const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    for (const line of envFile.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
}
loadEnv();

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "public/marketing");
// Use Stephen for screenshot capture — his account works through normal auth
// (the bulk-inserted demo users hit "Database error finding user" because they
// were created via direct INSERT, missing some Supabase Auth internal state).
const DEMO_EMAIL = process.env.SCREENSHOT_USER_EMAIL || "stephen@backrow.tv";
const DEMO_PASSWORD = process.env.SCREENSHOT_USER_PASSWORD || "Tritium!20";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)/)?.[1] || "";
const PADDING = 36; // px around focal element
const SCALE = 2; // device scale factor for crisp 2x output

interface Shot {
  out: string;
  url: string;
  aspect: "4/3" | "16/9";
  /** Page-side function that marks the focal element with data-marketing-shot. Returns true on success. */
  findFocal: () => boolean;
  /** Optional extra wait after navigation (ms). Default 2500. */
  delay?: number;
  /** Override default padding for this shot. */
  padding?: number;
}

const CHROME_HIDER = `
  /* App chrome */
  body > header, body > nav, body > footer,
  header.sticky, header.fixed,
  [data-sidebar], aside, footer,
  /* Top dashboard "BackRow — ClubName" pill */
  div[class*="border"][class*="rounded-full"]:has(a[href="/home"]),
  /* Profile chip */
  button[aria-haspopup="menu"]:has(img),
  button[aria-label*="profile" i],
  /* Cookie banner / Next dev overlay / sidebar nav links */
  [class*="CookieConsent"], [class*="cookie-consent"],
  [data-nextjs-toast], nextjs-portal,
  /* Search/notification icons in top-right */
  a[href="/search"], a[href="/notifications"],
  /* Join banner shown to non-members */
  [class*="JoinBanner"], [class*="join-banner"] {
    display: none !important;
  }
  /* Reset main content top spacing now that header is gone */
  main { padding-top: 24px !important; }
  body { background: var(--background, #0b0d12) !important; }
  /* Hide nav rails on dashboard layout */
  div[class*="grid"]:has(> aside) > aside { display: none !important; }
`;

const SHOTS: Shot[] = [
  // ── 4:3 archetype cards ───────────────────────────────────────────────
  {
    out: "archetype-friends-family.jpg",
    url: "/club/sunday-night-cinema/festival/80s-sci-fi",
    aspect: "4/3",
    findFocal: () => {
      // The fixed 520px-tall podium container — walk up one level to also
      // grab the navigation arrows and avoid clipping the avatar tops.
      const podium = Array.from(document.querySelectorAll("div")).find((d) =>
        (d.getAttribute("class") || "").includes("h-[520px]")
      );
      const target = podium?.parentElement || podium;
      if (!target) return false;
      target.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
  {
    out: "archetype-podcast.jpg",
    url: "/club/the-cinephile-cast/endless",
    aspect: "4/3",
    findFocal: () => {
      // The "now playing" carousel + title + pitch — find Goodfellas heading and walk up to a wrapper that includes the carousel
      const heading = Array.from(document.querySelectorAll("h1, h2, h3")).find((h) =>
        /Goodfellas/i.test(h.textContent || "")
      ) as HTMLElement | undefined;
      if (!heading) return false;
      let node: HTMLElement | null = heading.parentElement;
      // Walk up until we have an ancestor that contains an <img> (the poster)
      while (node && !node.querySelector("img")) node = node.parentElement;
      if (!node) return false;
      node.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
  {
    out: "archetype-theater.jpg",
    url: "/club/the-roxie/endless",
    aspect: "4/3",
    findFocal: () => {
      const heading = Array.from(document.querySelectorAll("h1, h2, h3")).find((h) =>
        /Godfather/i.test(h.textContent || "")
      ) as HTMLElement | undefined;
      if (!heading) return false;
      let node: HTMLElement | null = heading.parentElement;
      while (node && !node.querySelector("img")) node = node.parentElement;
      if (!node) return false;
      node.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
  {
    out: "archetype-fandom.jpg",
    url: "/club/horror-hall-of-fame/members",
    aspect: "4/3",
    padding: 24,
    findFocal: () => {
      // Find a leaf element whose text exactly matches a known member name (e.g. an <a> or <span> with just "Aisha Khan").
      const known = ["Aisha Khan", "Antonio Russo", "Beckett Foster", "Camila Santos"];
      let leaf: HTMLElement | null = null;
      const allLeaves = Array.from(
        document.querySelectorAll("a, span, p, button, h1, h2, h3, h4")
      ).filter((el) => el.children.length === 0) as HTMLElement[];
      for (const el of allLeaves) {
        const t = (el.textContent || "").trim();
        if (known.includes(t)) {
          leaf = el;
          break;
        }
      }
      if (!leaf) return false;
      // Walk up until we find an ancestor that has multiple sibling rows (each containing one member).
      // The list container is the parent whose direct children are member rows.
      let container: HTMLElement | null = null;
      let node: HTMLElement | null = leaf;
      while (node?.parentElement) {
        const parentEl: HTMLElement = node.parentElement;
        if (parentEl.tagName === "MAIN" || parentEl.tagName === "BODY") break;
        if (parentEl.children.length >= 5) {
          let matchingChildren = 0;
          const children: Element[] = Array.from(parentEl.children);
          for (const c of children) {
            const ct = (c as HTMLElement).textContent || "";
            for (const n of known) {
              if (ct.includes(n)) {
                matchingChildren++;
                break;
              }
            }
          }
          if (matchingChildren >= 3) {
            container = parentEl;
            break;
          }
        }
        node = parentEl;
      }
      if (!container) return false;
      // Tighten — hide rows beyond the 8th
      Array.from(container.children).forEach((child, i) => {
        if (i >= 8) (child as HTMLElement).style.display = "none";
      });
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const b of buttons) {
        if (/show more/i.test(b.textContent || "")) (b as HTMLElement).style.display = "none";
      }
      container.setAttribute("data-marketing-shot", "");
      return true;
    },
  },

  // ── 5 slideshow frames (16:9) ─────────────────────────────────────────
  {
    out: "festival-demo-frame-1.jpg",
    url: "/club/sunday-night-cinema/festival/modern-heists",
    aspect: "16/9",
    findFocal: () => {
      // Theme header + countdown + nomination grid
      const heading = Array.from(document.querySelectorAll("h1, h2")).find((h) =>
        /Modern Heists/i.test(h.textContent || "")
      ) as HTMLElement | undefined;
      if (!heading) return false;
      let node: HTMLElement | null = heading.parentElement;
      // Walk up to capture both the theme header AND the nomination carousel below
      for (let i = 0; i < 3 && node?.parentElement; i++) node = node.parentElement;
      if (!node) return false;
      node.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
  {
    out: "festival-demo-frame-2.jpg",
    url: "/club/sunday-night-cinema/festival/modern-heists",
    aspect: "16/9",
    findFocal: () => {
      // Just the nomination grid (posters)
      const img = Array.from(document.querySelectorAll("img")).find((i) =>
        /tmdb/i.test((i as HTMLImageElement).src || "")
      );
      if (!img) return false;
      let node: HTMLElement | null = img as HTMLImageElement;
      // Walk up to the grid wrapper (siblings = other movie tiles)
      for (let i = 0; i < 3 && node?.parentElement; i++) node = node.parentElement;
      if (!node) return false;
      node.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
  {
    out: "festival-demo-frame-3.jpg",
    url: "/club/sunday-night-cinema/festival/cult-classics",
    aspect: "16/9",
    findFocal: () => {
      const heading = Array.from(document.querySelectorAll("h1, h2, h3, p")).find((h) =>
        /Fight Club/i.test(h.textContent || "")
      ) as HTMLElement | undefined;
      if (!heading) return false;
      let node: HTMLElement | null = heading.parentElement;
      for (let i = 0; i < 3 && node?.parentElement; i++) node = node.parentElement;
      if (!node) return false;
      node.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
  {
    out: "festival-demo-frame-4.jpg",
    url: "/movies/550",
    aspect: "16/9",
    findFocal: () => {
      // Movie detail page — target the rate / watched buttons cluster
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        /rate/i.test(b.textContent || "")
      ) as HTMLElement | undefined;
      if (!btn) {
        // Fallback: just grab main's first child
        const fallback = document.querySelector("main")?.firstElementChild as HTMLElement | null;
        if (!fallback) return false;
        fallback.setAttribute("data-marketing-shot", "");
        return true;
      }
      let node: HTMLElement | null = btn;
      for (let i = 0; i < 3 && node?.parentElement; i++) node = node.parentElement;
      if (!node) return false;
      node.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
  {
    out: "festival-demo-frame-5.jpg",
    url: "/club/sunday-night-cinema/festival/80s-sci-fi",
    aspect: "16/9",
    findFocal: () => {
      const podium = Array.from(document.querySelectorAll("div")).find((d) =>
        (d.getAttribute("class") || "").includes("h-[520px]")
      );
      const target = podium?.parentElement || podium;
      if (!target) return false;
      target.setAttribute("data-marketing-shot", "");
      return true;
    },
  },
];

/**
 * Sign in via Supabase admin generateLink (service role key). Currently unused —
 * kept for reference if the standard signInWithPassword path breaks again.
 */
async function _signInViaMagicLink(context: BrowserContext, page: Page) {
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
    options: { redirectTo: `${BASE}/home` },
  });
  if (error || !data.properties?.action_link) {
    throw new Error(`generateLink failed: ${error?.message || "no link"}`);
  }
  // Rewrite the action_link to point at the local dev server's auth callback
  const actionLink = data.properties.action_link;
  // The action_link from Supabase has a /verify path with token + type — visit it via local dev so cookies set on localhost
  // Extract the verification token + type, then craft a localhost callback URL
  const url = new URL(actionLink);
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");
  if (!token || !type) throw new Error("Magic link missing token/type");
  // Visit Supabase's verify endpoint directly — it'll redirect back to our redirectTo with #access_token
  // Actually, simpler: use our own /auth/callback which exchanges code for session.
  // The /verify endpoint sets a Set-Cookie if Origin matches; cross-origin won't work.
  // Best path: use Supabase's verifyOtp directly via JS client with the token, get the session, then inject cookies.
  const { data: verifyData, error: verifyError } = await sb.auth.verifyOtp({
    token_hash: token,
    type: "magiclink",
  });
  if (verifyError || !verifyData.session) {
    throw new Error(`verifyOtp failed: ${verifyError?.message || "no session"}`);
  }
  // Build the @supabase/ssr cookie payload (base64-prefixed JSON)
  const sessionJson = JSON.stringify(verifyData.session);
  const encoded = "base64-" + Buffer.from(sessionJson).toString("base64");
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const MAX = 3180;
  const chunks: { name: string; value: string }[] = [];
  if (encoded.length <= MAX) chunks.push({ name: cookieName, value: encoded });
  else {
    for (let pos = 0, i = 0; pos < encoded.length; pos += MAX, i++) {
      chunks.push({ name: `${cookieName}.${i}`, value: encoded.slice(pos, pos + MAX) });
    }
  }
  await context.addCookies(
    chunks.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    }))
  );
  // Verify cookie works: GET / and check for redirect-or-200
  await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
  console.log(
    `→ signed in as ${DEMO_EMAIL} (cookies set: ${chunks.length} chunk${chunks.length > 1 ? "s" : ""})`
  );
}

async function captureShot(page: Page, shot: Shot) {
  console.log(`→ ${shot.out} (${shot.url})`);
  await page.goto(`${BASE}${shot.url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(shot.delay ?? 2500);
  await page.addStyleTag({ content: CHROME_HIDER });
  await page.waitForTimeout(300); // let layout settle after style injection

  const ok = await page.evaluate(shot.findFocal);
  if (!ok) {
    console.warn(`   ⚠ focal element not found, saving debug screenshot`);
    await page.screenshot({
      path: join(OUT, `_debug-${shot.out.replace(".jpg", ".png")}`),
      fullPage: true,
    });
    return;
  }
  // Wait for ALL images on the page to actually load (Next/Image proxies are async)
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs
        .filter((i) => !i.complete)
        .map(
          (i) =>
            new Promise<void>((resolve) => {
              i.addEventListener("load", () => resolve(), { once: true });
              i.addEventListener("error", () => resolve(), { once: true });
              setTimeout(resolve, 5000);
            })
        )
    );
  });
  // Scroll into view
  await page.evaluate(() => {
    const el = document.querySelector("[data-marketing-shot]") as HTMLElement | null;
    el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  });
  await page.waitForTimeout(700);

  const box = await page.locator("[data-marketing-shot]").first().boundingBox();
  if (!box) {
    console.warn(`   ⚠ no bounding box`);
    return;
  }

  // Compute clip rectangle: expand focal box to target aspect ratio with PADDING
  const pad = shot.padding ?? PADDING;
  const [aw, ah] = shot.aspect.split("/").map(Number);
  const targetAspect = aw / ah;
  const focalW = box.width;
  const focalH = box.height;
  const focalAspect = focalW / focalH;

  let clipW: number, clipH: number;
  if (focalAspect > targetAspect) {
    // Focal wider than target → pad vertically
    clipW = focalW + pad * 2;
    clipH = clipW / targetAspect;
  } else {
    // Focal taller than target → pad horizontally
    clipH = focalH + pad * 2;
    clipW = clipH * targetAspect;
  }

  // Clamp to viewport
  const viewport = page.viewportSize();
  if (viewport) {
    if (clipW > viewport.width) {
      clipW = viewport.width;
      clipH = clipW / targetAspect;
    }
    if (clipH > viewport.height) {
      clipH = viewport.height;
      clipW = clipH * targetAspect;
    }
  }

  let clipX = box.x + focalW / 2 - clipW / 2;
  let clipY = box.y + focalH / 2 - clipH / 2;
  clipX = Math.max(0, clipX);
  clipY = Math.max(0, clipY);

  const tmp = join(OUT, `_tmp-${shot.out.replace(".jpg", ".png")}`);
  await page.screenshot({
    path: tmp,
    clip: { x: clipX, y: clipY, width: clipW, height: clipH },
    scale: "device",
  });
  console.log(`   captured (${Math.round(clipW)}×${Math.round(clipH)})`);
}

async function main() {
  await mkdirP(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: SCALE,
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "backrow-cookie-consent",
        JSON.stringify({ analytics: true, gpc: false, version: 1, timestamp: Date.now() })
      );
    } catch {}
  });

  // Use signInWithPassword + cookie injection (works for normal-created users)
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await sb.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Sign-in failed: ${error?.message || "no session"}`);
  }
  const sessionJson = JSON.stringify(data.session);
  const encoded = "base64-" + Buffer.from(sessionJson).toString("base64");
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const MAX = 3180;
  const chunks: { name: string; value: string }[] = [];
  if (encoded.length <= MAX) chunks.push({ name: cookieName, value: encoded });
  else {
    for (let pos = 0, i = 0; pos < encoded.length; pos += MAX, i++) {
      chunks.push({ name: `${cookieName}.${i}`, value: encoded.slice(pos, pos + MAX) });
    }
  }
  await context.addCookies(
    chunks.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    }))
  );
  console.log(
    `→ signed in as ${DEMO_EMAIL} (${chunks.length} cookie chunk${chunks.length > 1 ? "s" : ""})`
  );
  const page = await context.newPage();

  for (const shot of SHOTS) {
    try {
      await captureShot(page, shot);
    } catch (err) {
      console.error(`   ✗ ${shot.out} failed:`, err);
    }
  }

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
