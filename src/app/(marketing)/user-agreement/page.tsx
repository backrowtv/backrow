import type { Metadata } from "next";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "User Agreement - BackRow",
  description:
    "Read BackRow's user agreement to understand your rights and responsibilities when using our movie social platform.",
  alternates: { canonical: absoluteUrl("/user-agreement") },
  openGraph: {
    title: "User Agreement - BackRow",
    description:
      "Read BackRow's user agreement to understand your rights and responsibilities when using our movie social platform.",
    type: "website",
    url: absoluteUrl("/user-agreement"),
    siteName: "BackRow",
  },
};

// Static last updated date - update manually when agreement changes
const LAST_UPDATED = "April 16, 2026";

export default async function UserAgreementPage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/" label="Home" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">User Agreement</h1>
          <p className="text-xs text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              1. Acceptance of Terms
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              By accessing or using BackRow, you agree to be bound by this User Agreement and all
              applicable laws and regulations. If you do not agree with any of these terms, you are
              prohibited from using or accessing this platform.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              2. Description of Service
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow is a movie social platform that enables users to create and participate in
              themed film festivals with friends. Our service includes features for movie
              nominations, ratings, discussions, and competitive elements such as standings and
              results.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">3. User Accounts</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              To use certain features of BackRow, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and update your account information to keep it accurate</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">4. User Conduct</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              You agree not to use BackRow to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others, including intellectual property rights</li>
              <li>Post or transmit any content that is harmful, offensive, or inappropriate</li>
              <li>Engage in any activity that disrupts or interferes with the service</li>
              <li>Attempt to gain unauthorized access to any part of the platform</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              5. Content and Intellectual Property
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You retain ownership of any content you post on BackRow. By posting content, you grant
              BackRow a non-exclusive, worldwide, royalty-free license to use, display, and
              distribute your content on the platform.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              6. Privacy Policy
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
              Your privacy is important to us. This section explains how we collect, use, and
              protect your personal information.
            </p>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              6.1 Information We Collect
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)] mb-3">
              <li>
                <strong>Account Information:</strong> Email address, display name, and profile
                picture when you create an account
              </li>
              <li>
                <strong>Usage Data:</strong> Your interactions with the platform, including movies
                you rate, nominations, and festival participation
              </li>
              <li>
                <strong>Movie Preferences:</strong> Your ratings, reviews, and movie-related
                activity within clubs
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, IP address, and general location
                for security and analytics
              </li>
            </ul>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              6.2 How We Use Your Information
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)] mb-3">
              <li>To provide and maintain the BackRow service</li>
              <li>To personalize your experience and show relevant content</li>
              <li>To communicate with you about your account, updates, and features</li>
              <li>To analyze usage patterns and improve our platform</li>
              <li>To detect and prevent fraud or security issues</li>
            </ul>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">6.3 Data Sharing</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-1">
              We do not sell your personal data. We may share information with:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)] mb-3">
              <li>
                <strong>Club Members:</strong> Your ratings, nominations, and activity within clubs
                you join
              </li>
              <li>
                <strong>Service Providers:</strong> Third-party services that help us operate (e.g.,
                hosting, analytics)
              </li>
              <li>
                <strong>TMDB:</strong> We use The Movie Database API to provide movie information;
                no personal data is shared with them
              </li>
            </ul>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">6.4 Data Retention</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
              We retain your data for as long as your account is active. If you delete your account,
              we will remove your personal information within 30 days, except where we are required
              to retain it for legal purposes.
            </p>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">6.5 Your Rights</h3>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)] mb-3">
              <li>
                <strong>Access:</strong> You can view and download your data from your profile
                settings
              </li>
              <li>
                <strong>Correction:</strong> You can update your account information at any time
              </li>
              <li>
                <strong>Deletion:</strong> You can request deletion of your account and associated
                data
              </li>
              <li>
                <strong>Portability:</strong> You can export your ratings and activity data
              </li>
            </ul>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              6.6 Cookies and Tracking
            </h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
              We use essential cookies to maintain your session and authentication. We may use
              analytics tools to understand how users interact with our platform. You can control
              cookie preferences through your browser settings.
            </p>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              6.7 Children&apos;s Privacy
            </h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
              BackRow is not intended for users under 16 years of age. We do not knowingly collect
              personal information from children under 16.
            </p>

            <h3 className="text-sm font-medium text-[var(--text-primary)]">6.8 Privacy Contact</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              For privacy-related questions or requests, contact us at privacy@backrow.dev or
              through our contact page.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">7. Termination</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We reserve the right to suspend or terminate your account at any time, with or without
              notice, for any reason, including if you violate this User Agreement.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, either express or implied.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              9. Limitation of Liability
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              To the fullest extent permitted by law, BackRow shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              10. Changes to Agreement
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We reserve the right to modify this User Agreement at any time. We will notify users
              of any material changes by updating the &ldquo;Last updated&rdquo; date at the top of
              this page.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              11. Contact Information
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              If you have any questions about this User Agreement, please contact us through our
              contact page or at support@backrow.dev.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
