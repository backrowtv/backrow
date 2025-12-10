"use client";

import { useState } from "react";
import { Eye, EyeSlash, PencilSimple, Lock, UserPlus, GlobeSimple } from "@phosphor-icons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnifiedClubCard } from "@/components/clubs/UnifiedClubCard";
import type { PrivacyLevel } from "@/types/club-creation";

import type { StepReviewProps } from "./types";
import { WizardChoiceCard } from "./WizardChoiceCard";

const PRIVACY_OPTIONS: Array<{
  value: PrivacyLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Invite only — not discoverable",
    icon: <Lock className="w-5 h-5" weight="duotone" />,
  },
  {
    value: "public_moderated",
    label: "Moderated",
    description: "Discoverable, people can request to join",
    icon: <UserPlus className="w-5 h-5" weight="duotone" />,
  },
  {
    value: "public_open",
    label: "Open",
    description: "Discoverable, anyone can join instantly",
    icon: <GlobeSimple className="w-5 h-5" weight="duotone" />,
  },
];

function formatValue(
  state: StepReviewProps["state"],
  key: "mode" | "selection" | "nominations" | "blind" | "timing" | "competition"
) {
  switch (key) {
    case "mode":
      return state.festivalType === "endless" ? "Endless" : "Standard";
    case "selection":
      if (state.themeGovernance === "democracy") return "Democracy";
      if (state.themeGovernance === "random") return "Random";
      return "Autocracy";
    case "nominations":
      return `${state.maxNominationsPerUser} per member`;
    case "blind":
      return state.blindNominations ? "Blind" : "Visible";
    case "timing":
      return state.timingMode === "scheduled" ? "Scheduled" : "Manual";
    case "competition":
      return state.scoringEnabled ? "Competitive" : "Casual";
  }
}

export function StepReview({
  state,
  updateState,
  isAuthenticated,
  showAuthPassword,
  setShowAuthPassword,
  isPending,
  onSubmit,
  goToStep,
}: StepReviewProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const canSubmit = () => {
    if (isAuthenticated) return true;
    return (
      state.email.includes("@") &&
      state.username.length >= 3 &&
      state.authPassword.length >= 8 &&
      state.authPassword === state.confirmPassword &&
      termsAccepted &&
      privacyAccepted
    );
  };

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    updateState({ username: sanitized });
  };

  const isStandard = state.festivalType === "standard";

  const summaryRows: Array<{ label: string; value: string; step: number }> = [
    { label: "Mode", value: formatValue(state, "mode"), step: 1 },
    { label: "Theme selection", value: formatValue(state, "selection"), step: 3 },
    { label: "Nominations", value: formatValue(state, "nominations"), step: 3 },
    { label: "Anonymity", value: formatValue(state, "blind"), step: 3 },
    ...(isStandard
      ? [
          { label: "Timing", value: formatValue(state, "timing"), step: 3 },
          { label: "Competition", value: formatValue(state, "competition"), step: 3 },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div className="max-w-sm mx-auto">
        <UnifiedClubCard
          disableLink
          club={{
            id: "preview",
            slug: "preview",
            name: state.name || "Your club",
            description: state.description,
            picture_url: state.avatarPreview,
            avatar_icon: state.avatarIcon,
            avatar_color_index: state.avatarColorIndex,
            avatar_border_color_index: state.avatarBorderColorIndex,
            theme_color: state.themeColor,
            genres: state.genres,
            privacy: state.privacy,
            member_count: 1,
            festival_count: 0,
            movies_watched: 0,
          }}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="space-y-0.5">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Review
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Check your club before creating
            </p>
          </div>

          <div
            className="rounded-lg border p-4 space-y-3"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-base font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {state.name || "Unnamed club"}
                </p>
                {state.description && (
                  <p
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {state.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--primary)" }}
              >
                <PencilSimple className="w-3 h-3" />
                Edit
              </button>
            </div>

            <div
              className="border-t pt-3 space-y-2"
              style={{ borderColor: "var(--border)" }}
            >
              {summaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {row.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(row.step)}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--surface-2)] transition-colors flex-shrink-0"
                      style={{ color: "var(--primary)" }}
                    >
                      <PencilSimple className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-0.5">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Who can join?
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Control discovery and membership
              </p>
            </div>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.map((opt) => (
                <WizardChoiceCard
                  key={opt.value}
                  icon={opt.icon}
                  title={opt.label}
                  description={opt.description}
                  selected={state.privacy === opt.value}
                  onClick={() => updateState({ privacy: opt.value })}
                />
              ))}
            </div>
          </div>

          {!isAuthenticated && (
            <div
              className="space-y-3 pt-5 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Create your account
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={state.email}
                  onChange={(e) => updateState({ email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={state.username || ""}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="username"
                  minLength={3}
                  maxLength={30}
                />
                {state.username &&
                  state.username.length > 0 &&
                  state.username.length < 3 && (
                    <p className="text-xs" style={{ color: "var(--error)" }}>
                      At least 3 characters
                    </p>
                  )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="authPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="authPassword"
                    type={showAuthPassword ? "text" : "password"}
                    value={state.authPassword}
                    onChange={(e) => updateState({ authPassword: e.target.value })}
                    placeholder="At least 8 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                    aria-label={showAuthPassword ? "Hide password" : "Show password"}
                  >
                    {showAuthPassword ? (
                      <EyeSlash className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={state.confirmPassword}
                  onChange={(e) => updateState({ confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                />
                {state.confirmPassword &&
                  state.authPassword !== state.confirmPassword && (
                    <p className="text-xs" style={{ color: "var(--error)" }}>
                      Passwords don&apos;t match
                    </p>
                  )}
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="text-xs leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    I am at least 16 years old and agree to the{" "}
                    <Link
                      href="/terms-of-use"
                      target="_blank"
                      className="text-[var(--primary)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Use
                    </Link>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="text-xs leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    I agree to the{" "}
                    <Link
                      href="/privacy-policy"
                      target="_blank"
                      className="text-[var(--primary)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>
            </div>
          )}
        </section>
      </div>

      <Button
        onClick={onSubmit}
        disabled={!canSubmit() || isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? "Creating your club..." : "Create Club"}
      </Button>
    </div>
  );
}
