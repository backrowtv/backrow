import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/section";
import { LandingFAQ } from "@/components/marketing/LandingFAQ";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { LandingHero } from "@/components/marketing/LandingHero";

export const metadata: Metadata = {
  title: "BackRow - Movie Clubs",
  description:
    "Where movie lovers come together. Create clubs, run festivals, and compete with friends.",
  openGraph: {
    title: "BackRow - Movie Clubs",
    description:
      "Where movie lovers come together. Create clubs, run festivals, and compete with friends.",
    type: "website",
    url: "https://backrow.dev",
    images: [
      {
        url: "https://backrow.dev/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "BackRow - Movie Clubs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BackRow - Movie Clubs",
    description:
      "Where movie lovers come together. Create clubs, run festivals, and compete with friends.",
    images: ["https://backrow.dev/og-image.jpg"],
  },
  alternates: {
    canonical: "https://backrow.dev",
  },
};

interface LandingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
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
        <Container size="lg" className="py-12 md:py-16 px-4 sm:px-6">
          {/* How It Works */}
          <div className="mb-24 md:mb-32">
            <HowItWorks />
          </div>

          {/* FAQ Section */}
          <div className="mb-16 md:mb-24">
            <LandingFAQ />
          </div>
        </Container>
      </main>
    </div>
  );
}
