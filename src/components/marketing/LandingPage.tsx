import { redirect } from "next/navigation";
import { Container } from "@/components/ui/section";
import { ClubArchetypes } from "@/components/marketing/ClubArchetypes";
import { FestivalFlow } from "@/components/marketing/FestivalFlow";
import { LandingFAQ } from "@/components/marketing/LandingFAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { LandingHero } from "@/components/marketing/LandingHero";

/**
 * Anon landing page body. Rendered by src/app/page.tsx when the viewer
 * is not signed in. Previously lived at src/app/(marketing)/page.tsx but
 * that location collided with the root page on the same `/` URL and
 * caused webpack to skip emitting page_client-reference-manifest.js for
 * the `(marketing)` route-group (vercel/next.js#53569). Both files map
 * to `/`; only one can be a page. Turbopack tolerated the duplicate;
 * webpack does not. Moving the anon body to a plain component resolves
 * it. Metadata for `/` now lives on src/app/page.tsx.
 */

interface LandingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function LandingPage({ searchParams }: LandingPageProps) {
  const params = await searchParams;

  // Handle legacy URL params from old modal auth
  if (params["sign-in"] !== undefined) {
    redirect("/sign-in");
  }

  const showDeletedBanner = params["deleted"] === "1";

  return (
    <div className="flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      {showDeletedBanner ? (
        <div
          role="status"
          className="border-b border-border bg-warning/10 px-4 py-3 text-center text-sm text-warning-foreground"
        >
          Your account is pending deletion. It will be permanently removed in 30 days. Contact{" "}
          <a href="mailto:support@backrow.tv" className="underline">
            support@backrow.tv
          </a>{" "}
          to restore it before then.
        </div>
      ) : null}

      {/* Hero with nav + sign-up modal */}
      <LandingHero />

      {/* Main Content */}
      <main className="flex-1">
        <Container size="lg" className="pt-16 md:pt-24 pb-20 md:pb-28 px-4 sm:px-6">
          <div className="space-y-24 md:space-y-32">
            <ClubArchetypes />
            <FestivalFlow />
            <FinalCTA />
            <LandingFAQ />
          </div>
        </Container>
      </main>
    </div>
  );
}
