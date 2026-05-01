import { Metadata } from "next";
import { ClubCreationWizard } from "@/components/clubs/ClubCreationWizard";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "Create a Club - BackRow",
  description:
    "Start your movie club journey. Create a club, invite friends, and run film festivals together.",
  alternates: { canonical: absoluteUrl("/create-club") },
  openGraph: {
    title: "Create a Club - BackRow",
    description:
      "Start your movie club journey. Create a club, invite friends, and run film festivals together.",
    type: "website",
    url: absoluteUrl("/create-club"),
    siteName: "BackRow",
  },
};

export default function CreateClubPage() {
  return (
    <div className="relative" style={{ backgroundColor: "var(--background)" }}>
      <MarketingSidebarMount />
      {/* Content */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <ClubCreationWizard />
        </div>
      </div>
    </div>
  );
}
