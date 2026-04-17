import type { Metadata } from "next";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "Privacy Policy - BackRow",
  description:
    "Learn how BackRow collects, uses, and protects your personal information on our movie social platform.",
  alternates: { canonical: absoluteUrl("/privacy-policy") },
  openGraph: {
    title: "Privacy Policy - BackRow",
    description:
      "Learn how BackRow collects, uses, and protects your personal information on our movie social platform.",
    type: "website",
    url: absoluteUrl("/privacy-policy"),
    siteName: "BackRow",
  },
};

const LAST_UPDATED = "April 6, 2026";

export default async function PrivacyPolicyPage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/" label="Home" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Privacy Policy</h1>
          <p className="text-xs text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Introduction</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use the BackRow platform, including our
              website and related services (collectively, the &ldquo;Service&rdquo;).
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Information We Collect
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              We collect information you provide directly when using BackRow:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>
                <strong>Account information:</strong> email address, username, and password when you
                create an account
              </li>
              <li>
                <strong>Profile information:</strong> display name, avatar, and bio that you choose
                to provide
              </li>
              <li>
                <strong>Activity data:</strong> movie ratings, nominations, reviews, discussion
                posts, and festival participation
              </li>
              <li>
                <strong>Club data:</strong> clubs you create or join, festival settings, and member
                interactions
              </li>
              <li>
                <strong>Communications:</strong> messages you send through contact forms or feedback
                features
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Automatically Collected Information
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              When you access the Service, we may automatically collect:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>Device and browser information (type, version, operating system)</li>
              <li>IP address and approximate location</li>
              <li>Pages visited and features used</li>
              <li>Referring website or source</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Third-Party Services
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              BackRow integrates with the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>
                <strong>The Movie Database (TMDB):</strong> We use TMDB&apos;s API to provide movie
                information, posters, and cast details. TMDB&apos;s use is governed by their own
                privacy policy and terms of use.
              </li>
              <li>
                <strong>Supabase:</strong> Our backend infrastructure provider that stores your
                account data and handles authentication securely.
              </li>
              <li>
                <strong>Vercel:</strong> Our hosting provider that may collect standard web
                analytics data, subject to your cookie preferences.
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              How We Use Your Information
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>Provide, operate, and maintain the Service</li>
              <li>Create and manage your account</li>
              <li>Process your movie ratings, nominations, and festival participation</li>
              <li>Enable club features, discussions, and member interactions</li>
              <li>Send transactional emails (account verification, password resets)</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Monitor and analyze usage to improve the Service</li>
              <li>Detect and prevent fraud, abuse, or security issues</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Cookies and Tracking
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              We use the following types of cookies:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>
                <strong>Essential cookies:</strong> Required for authentication, session management,
                and core functionality. These cannot be disabled.
              </li>
              <li>
                <strong>Analytics cookies:</strong> Used to understand how visitors interact with
                the Service. These are only set with your explicit consent via our cookie
                preferences banner.
              </li>
            </ul>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You can manage your cookie preferences at any time through your browser settings or
              our cookie consent banner.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Data Security</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We implement appropriate technical and organizational security measures to protect
              your personal information, including encrypted connections (HTTPS), secure
              authentication, row-level security policies on our database, and input sanitization.
              However, no method of transmission over the Internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Data Retention and Deletion
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We retain your personal information for as long as your account is active. You can
              delete your account at any time through your profile settings.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Deletion is a two-step process: when you confirm, we immediately sign you out,
              anonymize your profile (email, username, display name, avatar, bio, social links), and
              set your account to the deleted state. Your account is then held for{" "}
              <strong>30 days</strong> in case you want to restore it — contact support during that
              window to reverse the deletion. After 30 days your account is permanently removed,
              including ratings, nominations, private notes, notifications, watch history, and club
              memberships. Content posted on other users&rsquo; threads (comments, shared club
              announcements) is kept with your authorship cleared so the surrounding conversation
              stays coherent.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You can also request a copy of your data at any time — we generate a ZIP containing
              your profile and every row you authored and email you a private download link that
              expires in 7 days.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Your Rights (GDPR)
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              If you are located in the European Economic Area (EEA), you have the following rights
              regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>
                <strong>Access:</strong> Request a copy of the personal data we hold about you
              </li>
              <li>
                <strong>Rectification:</strong> Request correction of inaccurate personal data
              </li>
              <li>
                <strong>Erasure:</strong> Request deletion of your personal data (available via
                account deletion)
              </li>
              <li>
                <strong>Portability:</strong> Request your data in a structured, machine-readable
                format
              </li>
              <li>
                <strong>Objection:</strong> Object to processing of your personal data for certain
                purposes
              </li>
              <li>
                <strong>Withdraw consent:</strong> Withdraw consent for analytics cookies at any
                time via the cookie preferences banner
              </li>
            </ul>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              To exercise any of these rights, please contact us at the address below.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Children&apos;s Privacy
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow is not intended for children under the age of 16. We do not knowingly collect
              personal information from children under 16. If we become aware that we have collected
              personal data from a child under 16, we will take steps to delete that information.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Changes to This Policy
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by updating the &ldquo;Last updated&rdquo; date at the top of this page. Your
              continued use of the Service after changes are posted constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Contact Us</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              If you have any questions about this Privacy Policy or wish to exercise your data
              rights, please contact us at support@backrow.dev or through our contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
