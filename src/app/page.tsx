import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Section, Container } from "@/components/ui/section";
import { Suspense } from "react";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { BlogSection } from "@/components/home/BlogSection";
import { HomeWidgets } from "@/components/home/HomeWidgets";
import { HomeMobileView } from "@/components/home/HomeMobileView";
import {
  FeaturedMovieSection,
  FeaturedClubSection,
  FeaturedMovieSkeleton,
  FeaturedClubSkeleton,
} from "@/components/home/FeaturedSections";
import { HomeThemedBackground } from "@/components/home/HomeThemedBackground";
import { HomeDesktopLayout } from "@/components/home/HomeDesktopLayout";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";
import { DashboardShortcuts } from "@/components/dashboard/DashboardShortcuts";
import { checkAndAdvanceFestivalPhases } from "@/app/actions/festivals";
import { checkAndRolloverSeasons } from "@/app/actions/seasons";
import { LandingPage } from "@/components/marketing/LandingPage";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "BackRow - Movie Clubs",
  description:
    "Where movie lovers come together. Create clubs, run festivals, and compete with friends.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: "BackRow - Movie Clubs",
    description:
      "Where movie lovers come together. Create clubs, run festivals, and compete with friends.",
    type: "website",
    url: absoluteUrl("/"),
    siteName: "BackRow",
  },
  twitter: {
    card: "summary_large_image",
    title: "BackRow - Movie Clubs",
    description:
      "Where movie lovers come together. Create clubs, run festivals, and compete with friends.",
  },
};

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Opt out of caching - this page needs fresh data on each request
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If authenticated, show authenticated home page
  if (user) {
    // Check and auto-advance phases if needed
    await checkAndAdvanceFestivalPhases();
    // Check and auto-rollover seasons if needed
    await checkAndRolloverSeasons();

    return (
      <div className="relative">
        <DashboardCommandPalette />
        <DashboardShortcuts />

        {/* Mobile View - shows below xl (1280px) */}
        <div className="xl:hidden">
          {/* Theater Frame - full width on mobile */}
          <HomeThemedBackground>
            <HomeHero />
          </HomeThemedBackground>
          <HomeMobileView />
        </div>

        {/* Desktop View - shows at xl (1280px) and up */}
        <div className="hidden xl:block">
          <Section variant="default" fullWidth className="!pt-4 !pb-8 bg-[var(--background)]">
            <Container size="lg" className="!px-4 lg:!px-6">
              <HomeDesktopLayout
                leftColumn={
                  <>
                    <HomeSidebar />
                    <div className="pt-3">
                      <BlogSection />
                    </div>
                  </>
                }
                theaterFrame={
                  <HomeThemedBackground>
                    <HomeHero />
                  </HomeThemedBackground>
                }
                centerContent={
                  <>
                    <Suspense fallback={<FeaturedMovieSkeleton />}>
                      <FeaturedMovieSection />
                    </Suspense>
                    <Suspense fallback={<FeaturedClubSkeleton />}>
                      <FeaturedClubSection />
                    </Suspense>
                  </>
                }
                rightColumn={<HomeWidgets />}
              />
            </Container>
          </Section>
        </div>
      </div>
    );
  }

  // If not authenticated, show marketing landing page
  return <LandingPage searchParams={searchParams} />;
}
