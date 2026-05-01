import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/EmptyState";
import { Star } from "@phosphor-icons/react/dist/ssr";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "Subscriptions - BackRow",
  description: "BackRow account plans and billing information.",
  alternates: { canonical: absoluteUrl("/subscriptions") },
  openGraph: {
    title: "Subscriptions - BackRow",
    description: "BackRow account plans and billing information.",
    type: "website",
    url: absoluteUrl("/subscriptions"),
    siteName: "BackRow",
  },
};

export default async function SubscriptionsPage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/" label="Home" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Subscriptions</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Unlock premium features and enhance your movie club experience
          </p>
        </div>

        <EmptyState
          icon={Star}
          title="Coming soon"
          message="We're working on exciting subscription plans and premium features. Stay tuned for updates!"
          variant="card"
        />
      </div>
    </div>
  );
}
