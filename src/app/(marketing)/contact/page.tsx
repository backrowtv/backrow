import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";

export const metadata: Metadata = {
  title: "Contact Us - BackRow",
  description: "Get in touch with the BackRow team. We'd love to hear from you!",
  openGraph: {
    title: "Contact Us - BackRow",
    description: "Get in touch with the BackRow team. We'd love to hear from you!",
    type: "website",
  },
};

export default async function ContactPage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/" label="Home" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Contact Us</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Have a question, suggestion, or feedback? We&apos;d love to hear from you!
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
