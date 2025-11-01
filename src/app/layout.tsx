import type { Metadata, Viewport } from "next";
import { Poppins, Onest, JetBrains_Mono, Righteous } from "next/font/google";
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
import { getDisplayPreferences, getThemePreferences } from "@/app/actions/display-preferences";
import { ThemeSyncProvider } from "@/components/ThemeSyncProvider";
import { CookieConsent } from "@/components/compliance/CookieConsent";

// Simple loading skeleton for layout
function LayoutSkeleton() {
  return <div className="flex-1" />;
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

// Server component that fetches auth and preferences - wrapped in Suspense to not block layout
async function AuthFetcher({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch preferences in parallel (will use defaults if not authenticated)
  const [displayPreferences, themePreferences] = await Promise.all([
    getDisplayPreferences(),
    getThemePreferences(),
  ]);

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
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = stored || (prefersDark ? 'dark' : 'light');
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                  var themeColor = theme === 'dark' ? '#111311' : '#f7f5f0';
                  var metas = document.querySelectorAll('meta[name="theme-color"]');
                  metas.forEach(function(meta) {
                    meta.setAttribute('content', themeColor);
                    meta.removeAttribute('media');
                  });
                  var colorTheme = localStorage.getItem('colorTheme');
                  if (colorTheme && colorTheme !== 'default') {
                    document.documentElement.setAttribute('data-color-theme', colorTheme);
                  }
                } catch (e) {
                  // Theme initialization failed - fall back to system preference
                  // This can happen if localStorage is unavailable (private browsing, storage full)
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
      </body>
    </html>
  );
}
