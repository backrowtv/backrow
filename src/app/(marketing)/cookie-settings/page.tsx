import type { Metadata } from "next";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { CookieSettingsForm } from "@/components/compliance/CookieSettingsForm";

export const metadata: Metadata = {
  title: "Cookie Settings - BackRow",
  description:
    "Manage your BackRow cookie preferences. Opt in or out of analytics cookies at any time.",
  alternates: { canonical: absoluteUrl("/cookie-settings") },
  robots: { index: false },
};

export default function CookieSettingsPage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <MobileBackButton href="/" label="Home" />
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Cookie Settings</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Change your cookie preferences for BackRow. Essential cookies are required for sign-in
            and core functionality and cannot be turned off. Changes apply immediately on this
            device.
          </p>
        </header>
        <CookieSettingsForm />
      </div>
    </div>
  );
}
