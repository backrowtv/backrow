import type { Metadata } from "next";
import Link from "next/link";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "Do Not Sell or Share My Personal Information - BackRow",
  description:
    "Your California Consumer Privacy Act (CCPA) rights on BackRow, including how to opt out of the sale or sharing of personal information.",
  alternates: { canonical: absoluteUrl("/do-not-sell-or-share") },
  openGraph: {
    title: "Do Not Sell or Share My Personal Information - BackRow",
    description:
      "Your CCPA rights on BackRow — how to opt out of the sale or sharing of personal information.",
    type: "website",
    url: absoluteUrl("/do-not-sell-or-share"),
    siteName: "BackRow",
  },
};

const LAST_UPDATED = "April 23, 2026";

export default function DoNotSellOrSharePage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <MobileBackButton href="/" label="Home" />

        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Do Not Sell or Share My Personal Information
          </h1>
          <p className="text-xs text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Your California Privacy Rights
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Under the California Consumer Privacy Act, as amended by the California Privacy Rights
              Act (collectively, &ldquo;CCPA&rdquo;), California residents have the right to opt out
              of the <strong>sale</strong> or <strong>sharing</strong> of their personal
              information. This page explains how that right applies to BackRow and how to exercise
              it.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              What BackRow does
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow does not sell your personal information for money. We also do not share your
              personal information with advertising networks, data brokers, or social-media pixels
              for cross-context behavioral advertising.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              The CCPA defines &ldquo;sharing&rdquo; broadly enough that routine analytics may
              qualify. To be conservative, we treat our analytics cookies as a &ldquo;share&rdquo;
              and give you the ability to opt out of them.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">How to opt out</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You have two ways to exercise your opt-out right:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-sm text-[var(--text-muted)]">
              <li>
                <strong>Global Privacy Control (GPC).</strong> If your browser sends a Global
                Privacy Control signal, BackRow automatically treats the signal as a valid opt-out.
                We set analytics to off without requiring you to see or click a banner. You can
                enable GPC in your browser&rsquo;s privacy settings or via an extension.
              </li>
              <li>
                <strong>
                  Manage your preferences on{" "}
                  <Link href="/cookie-settings" className="underline">
                    the cookie settings page
                  </Link>
                  .
                </strong>{" "}
                Turn analytics off and save. The preference is reversible at any time.
              </li>
            </ul>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Preferences are stored per-device. If you use BackRow on multiple browsers or devices,
              set your preference on each.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Categories of information we collect and share
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              For a full list of the categories of personal information we collect and the
              third-party service providers that receive it, see our{" "}
              <Link href="/privacy-policy" className="underline">
                Privacy Policy
              </Link>
              . In summary:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>
                <strong>Identifiers:</strong> account email, username, display name, avatar URL.
              </li>
              <li>
                <strong>Internet activity:</strong> pages visited, features used, approximate
                IP-derived region (hosting provider only).
              </li>
              <li>
                <strong>Content you create:</strong> ratings, nominations, comments, discussion
                posts, club memberships.
              </li>
              <li>
                <strong>Recipients:</strong> Supabase (backend, required), Vercel (hosting,
                required), TMDB (movie data, outbound only), Resend (transactional email, required),
                Upstash (rate limiting, required), Sentry (error monitoring, opt-in via analytics
                consent).
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Alternative request methods
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              If you are unable to use the automated mechanisms above, or if you are submitting a
              request on behalf of a California resident as an authorized agent, email us at{" "}
              <a href="mailto:support@backrow.dev" className="underline">
                support@backrow.dev
              </a>{" "}
              with the subject line &ldquo;CCPA Opt-Out.&rdquo; We will process the request within
              15 business days and may ask you to verify your identity through your BackRow account
              sign-in.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You can also request account deletion or a copy of your data from your{" "}
              <Link href="/profile/settings/account" className="underline">
                account settings
              </Link>{" "}
              at any time.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Non-discrimination
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We will not deny service, charge a different price, or provide a different level of
              quality because you exercised your CCPA rights.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
