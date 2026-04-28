import type { Metadata, Viewport } from "next";
import { Poppins, Onest, JetBrains_Mono, Righteous } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Suspense } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { FooterWithCredits } from "@/components/layout/FooterWithCredits";
import { Toaster } from "@/components/ui/toast";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { UserProfileProvider } from "@/components/auth/UserProfileProvider";
import { DismissedHintsMigration } from "@/components/auth/DismissedHintsMigration";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/server";
import { DisplayPreferencesProvider } from "@/contexts/DisplayPreferencesContext";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DEFAULT_THEME_PREFERENCES,
  type DateFormat,
  type DisplayPreferences,
  type ThemePreferences,
} from "@/lib/display-preferences-constants";
import { ThemeSyncProvider } from "@/components/ThemeSyncProvider";
import { CookieConsent } from "@/components/compliance/CookieConsent";
import { VercelAnalytics } from "@/components/analytics/VercelAnalytics";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Layout skeleton rendered while AuthFetcher resolves.
// MUST contain visible content — an empty fallback causes Lighthouse to
// report NO_FCP on heavy pages (e.g. /club/[slug]) when streaming takes
// longer than the FCP measurement window. Giving browsers something
// paintable lets FCP fire on the shell instead of the streamed content.
function LayoutSkeleton() {
  return (
    <div
      className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm"
      aria-hidden="true"
    >
      <span className="opacity-60">Loading…</span>
    </div>
  );
}

// Primary sans-serif font (body text)
const poppins = Poppins({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Heading font
const onest = Onest({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Monospace font for code
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Brand font for BackRow, Back, Row text
const righteous = Righteous({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://backrow.tv"),
  title: "BackRow - Movie Clubs",
  description:
    "The best view is from the BackRow. Where movie clubs come together. Discover great films, compete together, and celebrate cinema.",
  keywords: [
    "movie club",
    "film festival",
    "movie social platform",
    "film ratings",
    "themed festivals",
    "movie nominations",
    "film discussion",
  ],
  authors: [{ name: "BackRow" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BackRow",
  },
  openGraph: {
    title: "BackRow - Movie Clubs",
    description:
      "The best view is from the BackRow. Where movie clubs come together. Discover great films, compete together, and celebrate cinema.",
    type: "website",
    locale: "en_US",
    siteName: "BackRow",
  },
  twitter: {
    card: "summary_large_image",
    title: "BackRow - Movie Clubs",
    description:
      "The best view is from the BackRow. Where movie clubs come together. Discover great films, compete together, and celebrate cinema.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" }, // hsl(40 18% 97%)
    { media: "(prefers-color-scheme: dark)", color: "#111311" }, // hsl(131 5% 7%)
  ],
};

// Server component that fetches auth and preferences. Wrapped in Suspense
// so it streams without blocking the shell. Single combined query for auth
// + both preference sets (was 3 separate round-trips before), plus a hard
// 2.5s timeout that falls back to defaults — so a slow or hanging Supabase
// call can never pin the Suspense fallback indefinitely on authenticated
// pages like /clubs and /club/[slug].
const AUTH_FETCH_TIMEOUT_MS = 2500;

type AuthSnapshot = {
  user: Awaited<
    ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>
  >["data"]["user"];
  displayPreferences: DisplayPreferences;
  themePreferences: ThemePreferences;
};

async function fetchAuthAndPreferences(): Promise<AuthSnapshot> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      displayPreferences: DEFAULT_DISPLAY_PREFERENCES,
      themePreferences: DEFAULT_THEME_PREFERENCES,
    };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  const socialLinks = (userRow?.social_links ?? {}) as Record<string, unknown>;
  const dp = socialLinks.display_preferences as Partial<DisplayPreferences> | undefined;
  const tp = socialLinks.theme_preferences as Partial<ThemePreferences> | undefined;

  return {
    user,
    displayPreferences: {
      timeFormat: dp?.timeFormat === "24h" ? "24h" : "12h",
      dateFormat: (["MDY", "DMY", "YMD"] as DateFormat[]).includes(dp?.dateFormat as DateFormat)
        ? (dp!.dateFormat as DateFormat)
        : "MDY",
    },
    themePreferences: {
      theme: tp?.theme === "light" ? "light" : "dark",
      colorTheme: typeof tp?.colorTheme === "string" ? tp.colorTheme : "default",
    },
  };
}

async function AuthFetcher({ children }: { children: React.ReactNode }) {
  const fallback: AuthSnapshot = {
    user: null,
    displayPreferences: DEFAULT_DISPLAY_PREFERENCES,
    themePreferences: DEFAULT_THEME_PREFERENCES,
  };

  const timeoutPromise = new Promise<AuthSnapshot>((resolve) =>
    setTimeout(() => {
      console.warn(
        `[AuthFetcher] Supabase auth/prefs fetch exceeded ${AUTH_FETCH_TIMEOUT_MS}ms — rendering with defaults`
      );
      resolve(fallback);
    }, AUTH_FETCH_TIMEOUT_MS)
  );

  const result = await Promise.race([
    fetchAuthAndPreferences().catch((err) => {
      console.error("[AuthFetcher] Supabase auth/prefs fetch threw:", err);
      return fallback;
    }),
    timeoutPromise,
  ]);

  const { user, displayPreferences, themePreferences } = result;

  return (
    <AuthProvider initialUser={user}>
      <UserProfileProvider>
        <DismissedHintsMigration />
        <DisplayPreferencesProvider initialPreferences={displayPreferences}>
          <ThemeSyncProvider
            theme={themePreferences.theme}
            colorTheme={themePreferences.colorTheme}
          >
            {children}
          </ThemeSyncProvider>
        </DisplayPreferencesProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Root layout stays SYNC so cacheComponents can prerender every page
  // as a static shell. The header read for GPC detection lives inside
  // a Suspense boundary (see GpcMetaTag below) so the dynamic data
  // access is properly isolated.
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <Suspense fallback={null}>
          <GpcMetaTag />
        </Suspense>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Unauthenticated visitors always get dark mode, regardless of
                  // leftover localStorage from a previous session. Detect auth by
                  // looking for a Supabase auth-token cookie.
                  var hasAuthCookie = /(?:^|;)\\s*sb-[^=]*-auth-token/.test(document.cookie);
                  var theme;
                  if (!hasAuthCookie) {
                    theme = 'dark';
                  } else {
                    var stored = localStorage.getItem('theme');
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    theme = stored || (prefersDark ? 'dark' : 'light');
                  }
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                  var themeColor = theme === 'dark' ? '#111311' : '#f7f5f0';
                  var metas = document.querySelectorAll('meta[name="theme-color"]');
                  metas.forEach(function(meta) {
                    meta.setAttribute('content', themeColor);
                    meta.removeAttribute('media');
                  });
                  if (hasAuthCookie) {
                    var colorTheme = localStorage.getItem('colorTheme');
                    if (colorTheme && colorTheme !== 'default') {
                      document.documentElement.setAttribute('data-color-theme', colorTheme);
                    }
                  }
                } catch (e) {
                  console.warn('Theme initialization failed:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${poppins.variable} ${onest.variable} ${jetBrainsMono.variable} ${righteous.variable} antialiased min-h-screen flex flex-col`}
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        {/* Skip to main content link - WCAG 2.1 Level AA */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-md focus:outline-2 focus:outline-[var(--focus-ring)] focus:outline-offset-2"
        >
          Skip to main content
        </a>
        <CookieConsent />
        {/*
          AuthFetcher is wrapped in Suspense but with a fallback that renders the shell.
          This allows the UI to render immediately with null user, then hydrate with real user.
        */}
        <Suspense fallback={<LayoutSkeleton />}>
          <AuthFetcher>
            <TooltipProvider delayDuration={300} skipDelayDuration={100}>
              <SidebarProvider>
                <MobileSidebarProvider>
                  <Suspense fallback={<div style={{ height: "64px" }} />}>
                    <TopNav />
                  </Suspense>
                  <Suspense fallback={<LayoutSkeleton />}>
                    <ConditionalLayout>{children}</ConditionalLayout>
                  </Suspense>
                  <FooterWithCredits />
                </MobileSidebarProvider>
              </SidebarProvider>
            </TooltipProvider>
          </AuthFetcher>
        </Suspense>
        <Toaster />
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

async function GpcMetaTag() {
  const gpc = (await headers()).get("sec-gpc") === "1";
  if (!gpc) return null;
  return <meta name="x-gpc-signal" content="1" />;
}
