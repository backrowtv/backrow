"use client";

import { useCallback, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AutoSaveButton } from "@/components/ui/AutoSaveButton";
import {
  updateNotificationPreferences,
  updateClubNotificationPreferences,
} from "@/app/actions/profile";
import { useAutoSaveForm, usePushSubscription } from "@/hooks";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  FilmReel,
  FilmSlate,
  Users,
  CalendarDots,
  ListBullets,
  Trophy,
  Bell,
  CaretDown,
  EnvelopeSimple,
  BellSlash,
  BellRinging,
  DeviceMobile,
} from "@phosphor-icons/react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserClub {
  id: string;
  name: string;
  slug: string | null;
  avatar_icon: string | null;
  avatar_color_index: number | null;
  avatar_border_color_index: number | null;
}

interface ClubEmailPrefs {
  emailEnabled: boolean;
  emailFestivalUpdates: boolean;
  emailNewFestivals: boolean;
  emailDeadlineChanges: boolean;
  emailResultsRevealed: boolean;
  emailEndlessFestival: boolean;
  emailAnnouncements: boolean;
  emailEvents: boolean;
  emailPolls: boolean;
  emailSeasons: boolean;
  emailMentions: boolean;
  emailNewMessages: boolean;
}

const DEFAULT_CLUB_EMAIL_PREFS: ClubEmailPrefs = {
  emailEnabled: false,
  emailFestivalUpdates: false,
  emailNewFestivals: false,
  emailDeadlineChanges: false,
  emailResultsRevealed: false,
  emailEndlessFestival: false,
  emailAnnouncements: false,
  emailEvents: false,
  emailPolls: false,
  emailSeasons: false,
  emailMentions: false,
  emailNewMessages: false,
};

interface GlobalPreferences {
  // Master toggles
  allNotifications: boolean;
  allSiteNotifications: boolean;
  allEmailNotifications: boolean;
  allPushNotifications: boolean;
  // In-app — Festivals
  newFestivals: boolean;
  festivalUpdates: boolean;
  deadlineChanges: boolean;
  resultsRevealed: boolean;
  // In-app — Endless Festival
  endlessFestival: boolean;
  // In-app — Club Updates
  clubInvites: boolean;
  clubUpdates: boolean;
  announcements: boolean;
  // In-app — Events
  events: boolean;
  // In-app — Polls
  polls: boolean;
  // In-app — Seasons
  seasons: boolean;
  // In-app — Social
  mentions: boolean;
  newMessages: boolean;
  badges: boolean;
  // Email — meta
  emailNotifications: boolean;
  digestFrequency: "never" | "daily" | "weekly";
  emailEnabledClubs: string[];
  // Email — per-category
  emailNewFestivals: boolean;
  emailFestivalUpdates: boolean;
  emailDeadlineChanges: boolean;
  emailResultsRevealed: boolean;
  emailEndlessFestival: boolean;
  emailClubInvites: boolean;
  emailClubUpdates: boolean;
  emailAnnouncements: boolean;
  emailEvents: boolean;
  emailPolls: boolean;
  emailSeasons: boolean;
  emailMentions: boolean;
  emailNewMessages: boolean;
  emailBadges: boolean;
}

interface NotificationSettingsFormProps {
  initialPreferences: GlobalPreferences;
  userClubs?: UserClub[];
  initialClubEmailPrefs?: Record<string, Record<string, boolean>>;
}

// ─── Shared sub-components ───────────────────────────────────────────────────

interface NotificationSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  disabled?: boolean;
  sectionEnabled?: boolean;
  onSectionToggle?: (enabled: boolean) => void;
}

function NotificationSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  disabled = false,
  sectionEnabled = true,
  onSectionToggle,
}: NotificationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded && sectionEnabled);
  const effectiveExpanded = sectionEnabled && isExpanded;

  return (
    <div
      className={cn("transition-all", disabled && "opacity-50", !sectionEnabled && "opacity-60")}
    >
      <div className="flex items-center justify-between py-2.5">
        <button
          type="button"
          onClick={() => sectionEnabled && setIsExpanded(!isExpanded)}
          disabled={disabled || !sectionEnabled}
          className="flex items-center gap-2 flex-1 disabled:cursor-not-allowed"
        >
          <span className="text-[var(--text-muted)] [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              sectionEnabled ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
            )}
          >
            {title}
          </span>
          {sectionEnabled && (
            <CaretDown
              className={cn(
                "w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200",
                !effectiveExpanded && "-rotate-90"
              )}
            />
          )}
        </button>
        {onSectionToggle && (
          <Switch
            checked={sectionEnabled}
            onCheckedChange={onSectionToggle}
            disabled={disabled}
            className="ml-2"
          />
        )}
      </div>
      {effectiveExpanded && <div className="pl-6 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

interface NotificationToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className={cn("flex items-start gap-3", disabled && "opacity-50")}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <Label
          htmlFor={id}
          className={cn(
            "cursor-pointer text-sm text-[var(--text-primary)]",
            disabled && "cursor-not-allowed"
          )}
        >
          {label}
        </Label>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

interface MasterToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function MasterToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  icon,
}: MasterToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className={cn("flex items-center gap-2.5 transition-opacity", disabled && "opacity-50")}>
        {icon && (
          <span className="text-[var(--text-muted)] [&>svg]:w-4.5 [&>svg]:h-4.5">{icon}</span>
        )}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          <p className="text-xs text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

// ─── Expandable club section ─────────────────────────────────────────────────

function ClubEmailSection({
  club,
  prefs,
  onUpdate,
  disabled,
}: {
  club: UserClub;
  prefs: ClubEmailPrefs;
  onUpdate: (key: keyof ClubEmailPrefs, value: boolean) => void;
  disabled: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const clubEnabled = prefs.emailEnabled;

  const toggleAllClubEmail = (enabled: boolean) => {
    onUpdate("emailEnabled", enabled);
    if (enabled) {
      // Enable all categories when turning on
      onUpdate("emailFestivalUpdates", true);
      onUpdate("emailNewFestivals", true);
      onUpdate("emailDeadlineChanges", true);
      onUpdate("emailResultsRevealed", true);
      onUpdate("emailEndlessFestival", true);
      onUpdate("emailAnnouncements", true);
      onUpdate("emailEvents", true);
      onUpdate("emailPolls", true);
      onUpdate("emailSeasons", true);
      onUpdate("emailMentions", true);
      onUpdate("emailNewMessages", true);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] overflow-hidden",
        !clubEnabled && "opacity-70"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <button
          type="button"
          onClick={() => clubEnabled && setIsExpanded(!isExpanded)}
          disabled={disabled || !clubEnabled}
          className="flex items-center gap-2 flex-1 min-w-0 disabled:cursor-not-allowed"
        >
          <CaretDown
            className={cn(
              "w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 shrink-0",
              !isExpanded && "-rotate-90",
              !clubEnabled && "invisible"
            )}
          />
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {club.name}
          </span>
        </button>
        <Switch
          checked={clubEnabled}
          onCheckedChange={toggleAllClubEmail}
          disabled={disabled}
          className="ml-2 shrink-0"
        />
      </div>

      {clubEnabled && isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--border)] space-y-2.5">
          <NotificationToggle
            id={`${club.id}-email-festivals`}
            label="New festivals"
            checked={prefs.emailNewFestivals}
            onCheckedChange={(v) => onUpdate("emailNewFestivals", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-festival-updates`}
            label="Phase changes"
            checked={prefs.emailFestivalUpdates}
            onCheckedChange={(v) => onUpdate("emailFestivalUpdates", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-deadlines`}
            label="Deadline changes"
            checked={prefs.emailDeadlineChanges}
            onCheckedChange={(v) => onUpdate("emailDeadlineChanges", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-results`}
            label="Results revealed"
            checked={prefs.emailResultsRevealed}
            onCheckedChange={(v) => onUpdate("emailResultsRevealed", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-endless`}
            label="Endless festival updates"
            checked={prefs.emailEndlessFestival}
            onCheckedChange={(v) => onUpdate("emailEndlessFestival", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-announcements`}
            label="Announcements"
            checked={prefs.emailAnnouncements}
            onCheckedChange={(v) => onUpdate("emailAnnouncements", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-events`}
            label="Events"
            checked={prefs.emailEvents}
            onCheckedChange={(v) => onUpdate("emailEvents", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-polls`}
            label="Polls"
            checked={prefs.emailPolls}
            onCheckedChange={(v) => onUpdate("emailPolls", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-seasons`}
            label="Seasons"
            checked={prefs.emailSeasons}
            onCheckedChange={(v) => onUpdate("emailSeasons", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-mentions`}
            label="Mentions"
            checked={prefs.emailMentions}
            onCheckedChange={(v) => onUpdate("emailMentions", v)}
            disabled={disabled}
          />
          <NotificationToggle
            id={`${club.id}-email-messages`}
            label="New messages"
            checked={prefs.emailNewMessages}
            onCheckedChange={(v) => onUpdate("emailNewMessages", v)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

// ─── Collapsible per-club overrides container ────────────────────────────────

function ClubEmailOverridesSection({
  userClubs,
  clubEmailPrefs,
  onUpdate,
  disabled,
}: {
  userClubs: UserClub[];
  clubEmailPrefs: Record<string, ClubEmailPrefs>;
  onUpdate: (clubId: string, key: keyof ClubEmailPrefs, value: boolean) => void;
  disabled: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const enabledCount = userClubs.filter((c) => clubEmailPrefs[c.id]?.emailEnabled).length;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full group"
      >
        <CaretDown
          className={cn(
            "w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200",
            !isExpanded && "-rotate-90"
          )}
        />
        <Users className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">Per-Club Overrides</span>
        {enabledCount > 0 && (
          <span className="text-[10px] bg-[var(--primary)]/15 text-[var(--primary)] px-1.5 py-0.5 rounded-full font-medium">
            {enabledCount} club{enabledCount !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {!isExpanded && (
        <p className="text-xs text-[var(--text-muted)] pl-6">
          Customize which clubs send you email notifications
        </p>
      )}

      {isExpanded && (
        <div className="space-y-2 pl-6">
          <p className="text-xs text-[var(--text-muted)]">
            Enable email for specific clubs and customize what you receive from each
          </p>
          {userClubs.map((club) => (
            <ClubEmailSection
              key={club.id}
              club={club}
              prefs={clubEmailPrefs[club.id] || DEFAULT_CLUB_EMAIL_PREFS}
              onUpdate={(key, value) => onUpdate(club.id, key, value)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main form ───────────────────────────────────────────────────────────────

export function NotificationSettingsForm({
  initialPreferences,
  userClubs = [],
  initialClubEmailPrefs = {},
}: NotificationSettingsFormProps) {
  const [preferences, setPreferences] = useState(initialPreferences);

  const initialClubPrefs = (() => {
    const result: Record<string, ClubEmailPrefs> = {};
    for (const club of userClubs) {
      result[club.id] = {
        ...DEFAULT_CLUB_EMAIL_PREFS,
        ...(initialClubEmailPrefs[club.id] as Partial<ClubEmailPrefs>),
      };
    }
    return result;
  })();
  const [clubEmailPrefs, setClubEmailPrefs] =
    useState<Record<string, ClubEmailPrefs>>(initialClubPrefs);

  // Refs of last successfully-saved values — used by save() to diff and avoid
  // re-submitting unchanged sub-actions on every debounce fire.
  const savedPreferencesRef = useRef(initialPreferences);
  const savedClubEmailPrefsRef = useRef<Record<string, ClubEmailPrefs>>(initialClubPrefs);

  const [activeTab, setActiveTab] = useState<"in-app" | "email" | "push">("in-app");

  const save = useCallback(
    async ({
      preferences: p,
      clubEmailPrefs: c,
    }: {
      preferences: GlobalPreferences;
      clubEmailPrefs: Record<string, ClubEmailPrefs>;
    }) => {
      if (JSON.stringify(p) !== JSON.stringify(savedPreferencesRef.current)) {
        const result = await updateNotificationPreferences(p);
        if ("error" in result && result.error) return { error: result.error };
        savedPreferencesRef.current = p;
      }
      for (const club of userClubs) {
        const current = JSON.stringify(c[club.id]);
        const saved = JSON.stringify(savedClubEmailPrefsRef.current[club.id]);
        if (current !== saved) {
          const result = await updateClubNotificationPreferences(club.id, c[club.id]);
          if ("error" in result && result.error) {
            return { error: `Failed to save ${club.name}: ${result.error}` };
          }
          savedClubEmailPrefsRef.current = {
            ...savedClubEmailPrefsRef.current,
            [club.id]: c[club.id],
          };
        }
      }
      return { success: true };
    },
    [userClubs]
  );

  const {
    state: saveState,
    flush,
    lastSavedAt,
    error: saveError,
  } = useAutoSaveForm({
    values: { preferences, clubEmailPrefs },
    save,
    onError: (msg) => toast.error(msg),
  });

  const isPending = saveState === "saving";

  const {
    status: pushStatus,
    error: pushError,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushSubscription();

  const updatePreference = <K extends keyof GlobalPreferences>(
    key: K,
    value: GlobalPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const updateClubEmailPref = (clubId: string, key: keyof ClubEmailPrefs, value: boolean) => {
    setClubEmailPrefs((prev) => ({
      ...prev,
      [clubId]: { ...prev[clubId], [key]: value },
    }));
  };

  // ── Derived state ──
  const allSiteEnabled = preferences.allSiteNotifications && preferences.allNotifications;
  const allEmailEnabled = preferences.allEmailNotifications && preferences.allNotifications;
  const allPushEnabled = preferences.allPushNotifications && preferences.allNotifications;

  // In-app section helpers
  const isFestivalsEnabled =
    preferences.newFestivals ||
    preferences.festivalUpdates ||
    preferences.deadlineChanges ||
    preferences.resultsRevealed;
  const isEndlessFestivalEnabled = preferences.endlessFestival;
  const isClubUpdatesEnabled =
    preferences.announcements || preferences.clubUpdates || preferences.clubInvites;
  const isEventsEnabled = preferences.events;
  const isPollsEnabled = preferences.polls;
  const isSeasonsEnabled = preferences.seasons;
  const isSocialEnabled = preferences.mentions || preferences.newMessages || preferences.badges;

  // Email section helpers
  const isEmailFestivalsEnabled =
    preferences.emailNewFestivals ||
    preferences.emailFestivalUpdates ||
    preferences.emailDeadlineChanges ||
    preferences.emailResultsRevealed;
  const isEmailEndlessFestivalEnabled = preferences.emailEndlessFestival;
  const isEmailClubUpdatesEnabled =
    preferences.emailAnnouncements || preferences.emailClubUpdates || preferences.emailClubInvites;
  const isEmailEventsEnabled = preferences.emailEvents;
  const isEmailPollsEnabled = preferences.emailPolls;
  const isEmailSeasonsEnabled = preferences.emailSeasons;
  const isEmailSocialEnabled =
    preferences.emailMentions || preferences.emailNewMessages || preferences.emailBadges;

  // ── Section toggle helpers ──
  const toggleSection = (
    section:
      | "festivals"
      | "endlessFestival"
      | "clubUpdates"
      | "events"
      | "polls"
      | "seasons"
      | "social",
    enabled: boolean
  ) => {
    switch (section) {
      case "festivals":
        setPreferences((prev) => ({
          ...prev,
          newFestivals: enabled,
          festivalUpdates: enabled,
          deadlineChanges: enabled,
          resultsRevealed: enabled,
        }));
        break;
      case "endlessFestival":
        setPreferences((prev) => ({ ...prev, endlessFestival: enabled }));
        break;
      case "clubUpdates":
        setPreferences((prev) => ({
          ...prev,
          announcements: enabled,
          clubUpdates: enabled,
          clubInvites: enabled,
        }));
        break;
      case "events":
        setPreferences((prev) => ({ ...prev, events: enabled }));
        break;
      case "polls":
        setPreferences((prev) => ({ ...prev, polls: enabled }));
        break;
      case "seasons":
        setPreferences((prev) => ({ ...prev, seasons: enabled }));
        break;
      case "social":
        setPreferences((prev) => ({
          ...prev,
          mentions: enabled,
          newMessages: enabled,
          badges: enabled,
        }));
        break;
    }
  };

  const toggleEmailSection = (
    section:
      | "festivals"
      | "endlessFestival"
      | "clubUpdates"
      | "events"
      | "polls"
      | "seasons"
      | "social",
    enabled: boolean
  ) => {
    switch (section) {
      case "festivals":
        setPreferences((prev) => ({
          ...prev,
          emailNewFestivals: enabled,
          emailFestivalUpdates: enabled,
          emailDeadlineChanges: enabled,
          emailResultsRevealed: enabled,
        }));
        break;
      case "endlessFestival":
        setPreferences((prev) => ({ ...prev, emailEndlessFestival: enabled }));
        break;
      case "clubUpdates":
        setPreferences((prev) => ({
          ...prev,
          emailAnnouncements: enabled,
          emailClubUpdates: enabled,
          emailClubInvites: enabled,
        }));
        break;
      case "events":
        setPreferences((prev) => ({ ...prev, emailEvents: enabled }));
        break;
      case "polls":
        setPreferences((prev) => ({ ...prev, emailPolls: enabled }));
        break;
      case "seasons":
        setPreferences((prev) => ({ ...prev, emailSeasons: enabled }));
        break;
      case "social":
        setPreferences((prev) => ({
          ...prev,
          emailMentions: enabled,
          emailNewMessages: enabled,
          emailBadges: enabled,
        }));
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Master Toggle */}
      <MasterToggle
        label={preferences.allNotifications ? "Notifications Enabled" : "All Notifications Paused"}
        description={
          preferences.allNotifications
            ? "You're receiving notifications based on your preferences below"
            : "You won't receive any notifications until you turn this back on"
        }
        checked={preferences.allNotifications}
        onCheckedChange={(checked) => updatePreference("allNotifications", checked)}
        disabled={isPending}
        icon={
          preferences.allNotifications ? (
            <BellRinging className="w-5 h-5 text-[var(--primary)]" weight="fill" />
          ) : (
            <BellSlash className="w-5 h-5 text-[var(--text-muted)]" />
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-1)] rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("in-app")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
            activeTab === "in-app"
              ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          <Bell className="w-4 h-4" />
          In-App
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
            activeTab === "email"
              ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          <EnvelopeSimple className="w-4 h-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("push")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
            activeTab === "push"
              ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          <DeviceMobile className="w-4 h-4" />
          Push
        </button>
      </div>

      {/* ════════════════════ In-App Tab ════════════════════ */}
      {activeTab === "in-app" && (
        <div className="space-y-4">
          <MasterToggle
            label={allSiteEnabled ? "All In-App Notifications" : "In-App Notifications Paused"}
            description={
              allSiteEnabled
                ? "Receiving all enabled in-app notifications"
                : "In-app notifications are paused"
            }
            checked={preferences.allSiteNotifications}
            onCheckedChange={(checked) => updatePreference("allSiteNotifications", checked)}
            disabled={isPending || !preferences.allNotifications}
            icon={
              <Bell
                className={cn(
                  "w-5 h-5",
                  allSiteEnabled ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                )}
              />
            }
          />

          <div className={cn("space-y-3 transition-opacity", !allSiteEnabled && "opacity-50")}>
            <NotificationSection
              title="Festivals"
              icon={<FilmSlate className="w-4 h-4" />}
              disabled={!allSiteEnabled}
              sectionEnabled={isFestivalsEnabled}
              onSectionToggle={(enabled) => toggleSection("festivals", enabled)}
            >
              <NotificationToggle
                id="newFestivals"
                label="New festivals"
                description="When a new festival is created"
                checked={preferences.newFestivals}
                onCheckedChange={(v) => updatePreference("newFestivals", v)}
                disabled={isPending || !allSiteEnabled}
              />
              <NotificationToggle
                id="festivalUpdates"
                label="Phase changes"
                description="When a festival advances to a new phase"
                checked={preferences.festivalUpdates}
                onCheckedChange={(v) => updatePreference("festivalUpdates", v)}
                disabled={isPending || !allSiteEnabled}
              />
              <NotificationToggle
                id="deadlineChanges"
                label="Deadline changes"
                description="When festival deadlines are modified"
                checked={preferences.deadlineChanges}
                onCheckedChange={(v) => updatePreference("deadlineChanges", v)}
                disabled={isPending || !allSiteEnabled}
              />
              <NotificationToggle
                id="resultsRevealed"
                label="Results revealed"
                description="When festival results become available"
                checked={preferences.resultsRevealed}
                onCheckedChange={(v) => updatePreference("resultsRevealed", v)}
                disabled={isPending || !allSiteEnabled}
              />
            </NotificationSection>

            <NotificationSection
              title="Endless Festival"
              icon={<FilmReel className="w-4 h-4" />}
              disabled={!allSiteEnabled}
              sectionEnabled={isEndlessFestivalEnabled}
              onSectionToggle={(enabled) => toggleSection("endlessFestival", enabled)}
            >
              <NotificationToggle
                id="endlessFestival"
                label="Movie updates"
                description="When movies are added to pool or marked as concluded"
                checked={preferences.endlessFestival}
                onCheckedChange={(v) => updatePreference("endlessFestival", v)}
                disabled={isPending || !allSiteEnabled}
              />
            </NotificationSection>

            <NotificationSection
              title="Club Updates"
              icon={<Users className="w-4 h-4" />}
              disabled={!allSiteEnabled}
              sectionEnabled={isClubUpdatesEnabled}
              onSectionToggle={(enabled) => toggleSection("clubUpdates", enabled)}
            >
              <NotificationToggle
                id="announcements"
                label="Announcements"
                description="New club announcements"
                checked={preferences.announcements}
                onCheckedChange={(v) => updatePreference("announcements", v)}
                disabled={isPending || !allSiteEnabled}
              />
              <NotificationToggle
                id="clubUpdates"
                label="Club changes"
                description="Club name changes, archives, or deletions"
                checked={preferences.clubUpdates}
                onCheckedChange={(v) => updatePreference("clubUpdates", v)}
                disabled={isPending || !allSiteEnabled}
              />
              <NotificationToggle
                id="clubInvites"
                label="Club invitations"
                description="When you're invited to join a club"
                checked={preferences.clubInvites}
                onCheckedChange={(v) => updatePreference("clubInvites", v)}
                disabled={isPending || !allSiteEnabled}
              />
            </NotificationSection>

            <NotificationSection
              title="Events"
              icon={<CalendarDots className="w-4 h-4" />}
              disabled={!allSiteEnabled}
              sectionEnabled={isEventsEnabled}
              onSectionToggle={(enabled) => toggleSection("events", enabled)}
            >
              <NotificationToggle
                id="events"
                label="Event updates"
                description="New events, cancellations, and modifications"
                checked={preferences.events}
                onCheckedChange={(v) => updatePreference("events", v)}
                disabled={isPending || !allSiteEnabled}
              />
            </NotificationSection>

            <NotificationSection
              title="Polls"
              icon={<ListBullets className="w-4 h-4" />}
              disabled={!allSiteEnabled}
              sectionEnabled={isPollsEnabled}
              onSectionToggle={(enabled) => toggleSection("polls", enabled)}
            >
              <NotificationToggle
                id="polls"
                label="New polls"
                description="When a new poll is created"
                checked={preferences.polls}
                onCheckedChange={(v) => updatePreference("polls", v)}
                disabled={isPending || !allSiteEnabled}
              />
            </NotificationSection>

            <NotificationSection
              title="Seasons"
              icon={<Trophy className="w-4 h-4" />}
              disabled={!allSiteEnabled}
              sectionEnabled={isSeasonsEnabled}
              onSectionToggle={(enabled) => toggleSection("seasons", enabled)}
            >
              <NotificationToggle
                id="seasons"
                label="Season updates"
                description="Season start/end, date changes, and name changes"
                checked={preferences.seasons}
                onCheckedChange={(v) => updatePreference("seasons", v)}
                disabled={isPending || !allSiteEnabled}
              />
            </NotificationSection>

            <NotificationSection
              title="Social"
              icon={<Bell className="w-4 h-4" />}
              disabled={!allSiteEnabled}
              sectionEnabled={isSocialEnabled}
              onSectionToggle={(enabled) => toggleSection("social", enabled)}
            >
              <NotificationToggle
                id="mentions"
                label="Mentions"
                description="When someone mentions you"
                checked={preferences.mentions}
                onCheckedChange={(v) => updatePreference("mentions", v)}
                disabled={isPending || !allSiteEnabled}
              />
              <NotificationToggle
                id="newMessages"
                label="New messages"
                description="New discussion replies and comments"
                checked={preferences.newMessages}
                onCheckedChange={(v) => updatePreference("newMessages", v)}
                disabled={isPending || !allSiteEnabled}
              />
              <NotificationToggle
                id="badges"
                label="Badges earned"
                description="When you earn a new badge"
                checked={preferences.badges}
                onCheckedChange={(v) => updatePreference("badges", v)}
                disabled={isPending || !allSiteEnabled}
              />
            </NotificationSection>
          </div>
        </div>
      )}

      {/* ════════════════════ Email Tab ════════════════════ */}
      {activeTab === "email" && (
        <div className="space-y-4">
          <MasterToggle
            label={allEmailEnabled ? "Email Notifications Enabled" : "Email Notifications Off"}
            description={
              allEmailEnabled
                ? "You'll receive emails for the categories you enable below"
                : "Turn on to receive email notifications for important updates"
            }
            checked={preferences.allEmailNotifications}
            onCheckedChange={(checked) => updatePreference("allEmailNotifications", checked)}
            disabled={isPending || !preferences.allNotifications}
            icon={
              <EnvelopeSimple
                className={cn(
                  "w-5 h-5",
                  allEmailEnabled ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                )}
              />
            }
          />

          {allEmailEnabled ? (
            <div className="space-y-6">
              {/* Global email category toggles */}
              <div className={cn("space-y-3 transition-opacity", !allEmailEnabled && "opacity-50")}>
                <NotificationSection
                  title="Festivals"
                  icon={<FilmSlate className="w-4 h-4" />}
                  disabled={!allEmailEnabled}
                  sectionEnabled={isEmailFestivalsEnabled}
                  onSectionToggle={(enabled) => toggleEmailSection("festivals", enabled)}
                >
                  <NotificationToggle
                    id="emailNewFestivals"
                    label="New festivals"
                    description="When a new festival is created"
                    checked={preferences.emailNewFestivals}
                    onCheckedChange={(v) => updatePreference("emailNewFestivals", v)}
                    disabled={isPending}
                  />
                  <NotificationToggle
                    id="emailFestivalUpdates"
                    label="Phase changes"
                    description="When a festival advances to a new phase"
                    checked={preferences.emailFestivalUpdates}
                    onCheckedChange={(v) => updatePreference("emailFestivalUpdates", v)}
                    disabled={isPending}
                  />
                  <NotificationToggle
                    id="emailDeadlineChanges"
                    label="Deadline changes"
                    description="When festival deadlines are modified"
                    checked={preferences.emailDeadlineChanges}
                    onCheckedChange={(v) => updatePreference("emailDeadlineChanges", v)}
                    disabled={isPending}
                  />
                  <NotificationToggle
                    id="emailResultsRevealed"
                    label="Results revealed"
                    description="When festival results become available"
                    checked={preferences.emailResultsRevealed}
                    onCheckedChange={(v) => updatePreference("emailResultsRevealed", v)}
                    disabled={isPending}
                  />
                </NotificationSection>

                <NotificationSection
                  title="Endless Festival"
                  icon={<FilmReel className="w-4 h-4" />}
                  disabled={!allEmailEnabled}
                  sectionEnabled={isEmailEndlessFestivalEnabled}
                  onSectionToggle={(enabled) => toggleEmailSection("endlessFestival", enabled)}
                >
                  <NotificationToggle
                    id="emailEndlessFestival"
                    label="Movie updates"
                    description="When movies are added to pool or marked as concluded"
                    checked={preferences.emailEndlessFestival}
                    onCheckedChange={(v) => updatePreference("emailEndlessFestival", v)}
                    disabled={isPending}
                  />
                </NotificationSection>

                <NotificationSection
                  title="Club Updates"
                  icon={<Users className="w-4 h-4" />}
                  disabled={!allEmailEnabled}
                  sectionEnabled={isEmailClubUpdatesEnabled}
                  onSectionToggle={(enabled) => toggleEmailSection("clubUpdates", enabled)}
                >
                  <NotificationToggle
                    id="emailAnnouncements"
                    label="Announcements"
                    description="New club announcements"
                    checked={preferences.emailAnnouncements}
                    onCheckedChange={(v) => updatePreference("emailAnnouncements", v)}
                    disabled={isPending}
                  />
                  <NotificationToggle
                    id="emailClubUpdates"
                    label="Club changes"
                    description="Club name changes, archives, or deletions"
                    checked={preferences.emailClubUpdates}
                    onCheckedChange={(v) => updatePreference("emailClubUpdates", v)}
                    disabled={isPending}
                  />
                  <NotificationToggle
                    id="emailClubInvites"
                    label="Club invitations"
                    description="When you're invited to join a club"
                    checked={preferences.emailClubInvites}
                    onCheckedChange={(v) => updatePreference("emailClubInvites", v)}
                    disabled={isPending}
                  />
                </NotificationSection>

                <NotificationSection
                  title="Events"
                  icon={<CalendarDots className="w-4 h-4" />}
                  disabled={!allEmailEnabled}
                  sectionEnabled={isEmailEventsEnabled}
                  onSectionToggle={(enabled) => toggleEmailSection("events", enabled)}
                >
                  <NotificationToggle
                    id="emailEvents"
                    label="Event updates"
                    description="New events, cancellations, and modifications"
                    checked={preferences.emailEvents}
                    onCheckedChange={(v) => updatePreference("emailEvents", v)}
                    disabled={isPending}
                  />
                </NotificationSection>

                <NotificationSection
                  title="Polls"
                  icon={<ListBullets className="w-4 h-4" />}
                  disabled={!allEmailEnabled}
                  sectionEnabled={isEmailPollsEnabled}
                  onSectionToggle={(enabled) => toggleEmailSection("polls", enabled)}
                >
                  <NotificationToggle
                    id="emailPolls"
                    label="New polls"
                    description="When a new poll is created"
                    checked={preferences.emailPolls}
                    onCheckedChange={(v) => updatePreference("emailPolls", v)}
                    disabled={isPending}
                  />
                </NotificationSection>

                <NotificationSection
                  title="Seasons"
                  icon={<Trophy className="w-4 h-4" />}
                  disabled={!allEmailEnabled}
                  sectionEnabled={isEmailSeasonsEnabled}
                  onSectionToggle={(enabled) => toggleEmailSection("seasons", enabled)}
                >
                  <NotificationToggle
                    id="emailSeasons"
                    label="Season updates"
                    description="Season start/end, date changes, and name changes"
                    checked={preferences.emailSeasons}
                    onCheckedChange={(v) => updatePreference("emailSeasons", v)}
                    disabled={isPending}
                  />
                </NotificationSection>

                <NotificationSection
                  title="Social"
                  icon={<Bell className="w-4 h-4" />}
                  disabled={!allEmailEnabled}
                  sectionEnabled={isEmailSocialEnabled}
                  onSectionToggle={(enabled) => toggleEmailSection("social", enabled)}
                >
                  <NotificationToggle
                    id="emailMentions"
                    label="Mentions"
                    description="When someone mentions you"
                    checked={preferences.emailMentions}
                    onCheckedChange={(v) => updatePreference("emailMentions", v)}
                    disabled={isPending}
                  />
                  <NotificationToggle
                    id="emailNewMessages"
                    label="New messages"
                    description="New discussion replies and comments"
                    checked={preferences.emailNewMessages}
                    onCheckedChange={(v) => updatePreference("emailNewMessages", v)}
                    disabled={isPending}
                  />
                  <NotificationToggle
                    id="emailBadges"
                    label="Badges earned"
                    description="When you earn a new badge"
                    checked={preferences.emailBadges}
                    onCheckedChange={(v) => updatePreference("emailBadges", v)}
                    disabled={isPending}
                  />
                </NotificationSection>
              </div>

              {/* Per-club email preferences — collapsible section */}
              {userClubs.length > 0 && (
                <ClubEmailOverridesSection
                  userClubs={userClubs}
                  clubEmailPrefs={clubEmailPrefs}
                  onUpdate={updateClubEmailPref}
                  disabled={isPending}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4">
                <EnvelopeSimple className="w-8 h-8 text-[var(--primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Email Notifications
              </h3>
              <p className="text-sm text-[var(--text-muted)] max-w-md">
                Enable the toggle above to receive email notifications for important updates like
                festival results, club invitations, and mentions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ Push Tab ════════════════════ */}
      {activeTab === "push" && (
        <div className="space-y-4">
          <MasterToggle
            label={allPushEnabled ? "Push Notifications Enabled" : "Push Notifications Off"}
            description={
              allPushEnabled
                ? "Receive system notifications on this device even when BackRow isn't open"
                : "Mute push delivery without unsubscribing any devices"
            }
            checked={preferences.allPushNotifications}
            onCheckedChange={(checked) => updatePreference("allPushNotifications", checked)}
            disabled={isPending || !preferences.allNotifications}
            icon={
              <DeviceMobile
                className={cn(
                  "w-5 h-5",
                  allPushEnabled ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                )}
              />
            }
          />

          <div className={cn("transition-opacity", !allPushEnabled && "opacity-50")}>
            <div className="py-3">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">This device</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Enable push on this browser or device. You can repeat this from any other browser or
                device you use.
              </p>

              {pushStatus === "loading" && (
                <p className="text-xs text-[var(--text-muted)]">Checking push support…</p>
              )}

              {pushStatus === "unsupported" && (
                <p className="text-xs text-[var(--text-muted)]">
                  Push notifications aren&apos;t supported in this browser.
                </p>
              )}

              {pushStatus === "ios-needs-pwa" && (
                <p className="text-xs text-[var(--text-muted)]">
                  To enable push on iPhone or iPad, tap the Share button in Safari and choose
                  &ldquo;Add to Home Screen&rdquo;. Open BackRow from the home screen icon, then
                  come back here.
                </p>
              )}

              {pushStatus === "denied" && (
                <p className="text-xs text-[var(--text-muted)]">
                  You&apos;ve blocked notifications for this site. Re-enable them in your browser
                  settings, then refresh.
                </p>
              )}

              {pushStatus === "unsubscribed" && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={subscribePush}
                  disabled={isPending || !allPushEnabled}
                >
                  Enable on this device
                </Button>
              )}

              {pushStatus === "subscribed" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--primary)] font-medium">
                    Active on this device
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={unsubscribePush}
                    disabled={isPending}
                  >
                    Disable
                  </Button>
                </div>
              )}

              {pushError && (
                <p className="text-xs text-[var(--destructive)] mt-2" role="alert">
                  {pushError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Button — always visible, reflects auto-save state */}
      <div className="pt-4 border-t border-[var(--border)]">
        <AutoSaveButton
          state={saveState}
          onClick={flush}
          lastSavedAt={lastSavedAt}
          error={saveError}
          size="sm"
        />
      </div>
    </div>
  );
}
