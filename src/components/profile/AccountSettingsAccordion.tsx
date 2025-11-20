"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AccountSettingsForm } from "./AccountSettingsForm";
import { LinkedAccountsForm } from "./LinkedAccountsForm";
import { PrivacySettingsForm } from "./PrivacySettingsForm";
import { WatchSettingsForm } from "./WatchSettingsForm";
import { DataExportImport } from "./DataExportImport";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { Button } from "@/components/ui/button";
import {
  CaretDown,
  User,
  Eye,
  Television,
  Database,
  ShieldCheck,
  Link,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { DangerZoneSection } from "@/components/shared/DangerZoneSection";

interface AccountSettingsAccordionProps {
  // Account settings
  email: string;
  createdAt: string;
  dateOfBirth: string | null;
  socialLinks: {
    letterboxd?: string;
    letterboxd_visible?: boolean;
    imdb?: string;
    imdb_visible?: boolean;
    trakt?: string;
    trakt_visible?: boolean;
    tmdb?: string;
    tmdb_visible?: boolean;
    youtube?: string;
    youtube_visible?: boolean;
    twitter?: string;
    twitter_visible?: boolean;
    instagram?: string;
    instagram_visible?: boolean;
    reddit?: string;
    reddit_visible?: boolean;
    discord?: string;
    discord_visible?: boolean;
    tiktok?: string;
    tiktok_visible?: boolean;
  };
  displayName: string;
  lastDisplayNameChange: string | null;
  // Privacy settings
  privacySettings: {
    showProfilePopup: boolean;
  };
  // Watch settings
  showWatchProviders: boolean;
}

type SectionKey = "account" | "linked" | "security" | "privacy" | "watch" | "data";

interface AccordionSection {
  key: SectionKey;
  label: string;
  description: string;
  icon: typeof User;
}

const sections: AccordionSection[] = [
  { key: "account", label: "Account", description: "Email, username, member info", icon: User },
  {
    key: "linked",
    label: "Linked Accounts",
    description: "Connect your movie tracking profiles",
    icon: Link,
  },
  {
    key: "security",
    label: "Security",
    description: "Password and two-factor auth",
    icon: ShieldCheck,
  },
  { key: "privacy", label: "Privacy", description: "Profile popup and blocked users", icon: Eye },
  {
    key: "watch",
    label: "Where to Watch",
    description: "Streaming services and watch options",
    icon: Television,
  },
  { key: "data", label: "Data", description: "Manage your BackRow data", icon: Database },
];

export function AccountSettingsAccordion({
  email,
  createdAt,
  dateOfBirth,
  socialLinks,
  displayName,
  lastDisplayNameChange,
  privacySettings,
  showWatchProviders,
}: AccountSettingsAccordionProps) {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderContent = (key: SectionKey) => {
    switch (key) {
      case "account":
        return (
          <AccountSettingsForm
            email={email}
            createdAt={createdAt}
            dateOfBirth={dateOfBirth}
            displayName={displayName}
            lastDisplayNameChange={lastDisplayNameChange}
          />
        );
      case "linked":
        return <LinkedAccountsForm socialLinks={socialLinks} />;
      case "security":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Password</p>
                <p className="text-xs text-[var(--text-muted)]">Change your account password</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setChangePasswordOpen(true)}>
                Change
              </Button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Two-Factor Auth</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Add an extra layer of security to your account
                </p>
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Coming Soon
              </span>
            </div>
          </div>
        );
      case "privacy":
        return <PrivacySettingsForm initialShowProfilePopup={privacySettings.showProfilePopup} />;
      case "watch":
        return <WatchSettingsForm initialShowWatchProviders={showWatchProviders} />;
      case "data":
        return <DataExportImport />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-0 divide-y divide-[var(--border)]">
      {sections.map((section) => {
        const Icon = section.icon;
        const isOpen = openSections.has(section.key);

        return (
          <Collapsible
            key={section.key}
            open={isOpen}
            onOpenChange={() => toggleSection(section.key)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-2.5 py-3.5 transition-colors">
                <Icon className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{section.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{section.description}</p>
                </div>
                <CaretDown
                  className={cn(
                    "h-4 w-4 text-[var(--text-muted)] transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-lg bg-[var(--surface-1)]/50 p-4 mt-1">
                {renderContent(section.key)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Danger Zone - Collapsible */}
      <DangerZoneSection className="mt-6" description="Irreversible account actions">
        <div className="pt-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Delete Account</p>
              <p className="text-xs text-[var(--text-muted)]">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
              Delete
            </Button>
          </div>
        </div>
      </DangerZoneSection>

      <ChangePasswordModal
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        userEmail={email}
      />

      <DeleteAccountModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        userEmail={email}
      />
    </div>
  );
}
