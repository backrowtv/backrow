import type { Metadata } from "next";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "Terms of Use - BackRow",
  description:
    "Read BackRow's terms of use to understand the rules and guidelines for using our movie social platform.",
  alternates: { canonical: absoluteUrl("/terms-of-use") },
  openGraph: {
    title: "Terms of Use - BackRow",
    description:
      "Read BackRow's terms of use to understand the rules and guidelines for using our movie social platform.",
    type: "website",
    url: absoluteUrl("/terms-of-use"),
    siteName: "BackRow",
  },
};

// Static last updated date - update manually when terms change
const LAST_UPDATED = "April 16, 2026";

export default async function TermsOfUsePage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/" label="Home" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Terms of Use</h1>
          <p className="text-xs text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Introduction</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Welcome to BackRow. These Terms of Use govern your access to and use of the BackRow
              platform, including our website, mobile applications, and related services
              (collectively, the &ldquo;Service&rdquo;). By accessing or using the Service, you
              agree to be bound by these Terms of Use.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Eligibility</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You must be at least 16 years of age to use BackRow. If you are under 18, you
              represent that you have your parent&apos;s or guardian&apos;s permission to use the
              Service. By using BackRow, you represent and warrant that you meet these eligibility
              requirements.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Account Registration
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              To access certain features, you must register for an account. When you register, you
              agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>Provide accurate and complete information</li>
              <li>Keep your account information up to date</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Use of the Service
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              You may use BackRow for lawful purposes only. You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>Use the Service in any way that violates applicable laws or regulations</li>
              <li>Post, upload, or transmit any content that is illegal, harmful, or offensive</li>
              <li>Impersonate any person or entity or falsely state your affiliation</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Use automated systems or scripts to access the Service without authorization</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">User Content</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You are responsible for all content you post, upload, or otherwise make available on
              BackRow (&ldquo;User Content&rdquo;). You retain ownership of your User Content, but
              by posting it, you grant BackRow a worldwide, non-exclusive, royalty-free license to
              use, reproduce, modify, and distribute your User Content on the platform.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Movie Data and Third-Party Content
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow uses movie data and images from third-party services, including The Movie
              Database (TMDb). This content is provided for informational purposes only and is
              subject to the terms and licenses of those third-party services.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Intellectual Property Rights
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              The Service, including its original content, features, and functionality, is owned by
              BackRow and is protected by international copyright, trademark, patent, trade secret,
              and other intellectual property laws.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Termination</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately,
              without prior notice, for any reason, including if you breach these Terms of Use. Upon
              termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Disclaimers</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed uppercase">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, either express or implied. We disclaim all warranties,
              including but not limited to implied warranties of merchantability, fitness for a
              particular purpose, and non-infringement.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Limitation of Liability
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed uppercase">
              To the maximum extent permitted by law, BackRow shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits or
              revenues.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Changes to Terms</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We reserve the right to modify these Terms of Use at any time. We will notify users of
              material changes by updating the &ldquo;Last updated&rdquo; date at the top of this
              page.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Contact Us</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              If you have any questions about these Terms of Use, please contact us at
              support@backrow.dev or through our contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
