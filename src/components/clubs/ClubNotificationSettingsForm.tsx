"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateClubNotificationPreferences } from "@/app/actions/profile";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  FilmSlate,
  FilmReel,
  Users,
  CalendarDots,
  ListBullets,
  Trophy,
  Bell,
  CaretDown,
  CaretRight,
  BellSlash,
  BellRinging,
} from "@phosphor-icons/react";

interface ClubNotificationSettingsFormProps {
  clubId: string;
  initialPreferences: {
    // Master toggle
    allClubNotifications?: boolean;
    // Festival
    festivalUpdates: boolean;
    newFestivals: boolean;
    newNominations: boolean;
    phaseChanges: boolean;
    deadlineChanges: boolean;
    resultsRevealed: boolean;
    // Endless Festival
    endlessFestival: boolean;
    // Club
    clubUpdates: boolean;
    announcements: boolean;
    // Events
    events: boolean;
    // Polls
    polls: boolean;
    // Seasons
    seasons: boolean;
    // Social
    newMessages: boolean;
    mentions: boolean;
  };
}

interface NotificationSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  disabled?: boolean;
  allEnabled?: boolean;
  onToggleAll?: (enabled: boolean) => void;
}

function NotificationSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  disabled = false,
  allEnabled = true,
  onToggleAll,
}: NotificationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-[var(--surface-1)]">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 hover:opacity-80 transition-opacity disabled:cursor-not-allowed",
            disabled && "opacity-50"
          )}
        >
          <span className="text-[var(--primary)]">{icon}</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
          {isExpanded ? (
            <CaretDown className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <CaretRight className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </button>
        {onToggleAll && (
          <Switch
            checked={allEnabled}
            onCheckedChange={onToggleAll}
            disabled={disabled}
            aria-label={`Toggle all ${title.toLowerCase()} notifications`}
          />
        )}
      </div>
      {isExpanded && (
        <div
          className={cn(
            "p-3 space-y-2.5 bg-[var(--background)] transition-opacity",
            !allEnabled && "opacity-50"
          )}
        >
          {children}
        </div>
      )}
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
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-colors",
        checked
          ? "bg-[var(--surface-2)] border-[var(--active-border)]"
          : "bg-[var(--surface-1)] border-[var(--border)]"
      )}
    >
      <div className={cn("flex items-center gap-3 transition-opacity", disabled && "opacity-50")}>
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              checked ? "bg-[var(--surface-3)]" : "bg-[var(--surface-2)]"
            )}
          >
            {icon}
          </div>
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

export function ClubNotificationSettingsForm({
  clubId,
  initialPreferences,
}: ClubNotificationSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [preferences, setPreferences] = useState({
    ...initialPreferences,
    allClubNotifications: initialPreferences.allClubNotifications ?? true,
  });
  const [savedPreferences, setSavedPreferences] = useState({
    ...initialPreferences,
    allClubNotifications: initialPreferences.allClubNotifications ?? true,
  });

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(savedPreferences);

  const updatePreference = <K extends keyof typeof preferences>(
    key: K,
    value: (typeof preferences)[K]
  ) => {
    setPreferences({ ...preferences, [key]: value });
  };

  // Check if all notifications in a section are enabled
  const allFestivalsEnabled =
    preferences.newFestivals &&
    preferences.festivalUpdates &&
    preferences.newNominations &&
    preferences.phaseChanges &&
    preferences.deadlineChanges &&
    preferences.resultsRevealed;

  const allClubUpdatesEnabled = preferences.announcements && preferences.clubUpdates;
  const allSocialEnabled = preferences.mentions && preferences.newMessages;

  // Toggle all notifications in a section
  const toggleAllFestivals = (enabled: boolean) => {
    setPreferences({
      ...preferences,
      newFestivals: enabled,
      festivalUpdates: enabled,
      newNominations: enabled,
      phaseChanges: enabled,
      deadlineChanges: enabled,
      resultsRevealed: enabled,
    });
  };

  const toggleAllClubUpdates = (enabled: boolean) => {
    setPreferences({
      ...preferences,
      announcements: enabled,
      clubUpdates: enabled,
    });
  };

  const toggleAllSocial = (enabled: boolean) => {
    setPreferences({
      ...preferences,
      mentions: enabled,
      newMessages: enabled,
    });
  };

  const allEnabled = preferences.allClubNotifications;

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateClubNotificationPreferences(clubId, preferences);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Club notification preferences saved");
        setSavedPreferences(preferences);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <MasterToggle
        label={allEnabled ? "Club Notifications Enabled" : "Club Notifications Paused"}
        description={
          allEnabled
            ? "You're receiving notifications from this club based on your preferences below"
            : "You won't receive any notifications from this club until you turn this back on"
        }
        checked={allEnabled}
        onCheckedChange={(checked) => updatePreference("allClubNotifications", checked)}
        disabled={isPending}
        icon={
          allEnabled ? (
            <BellRinging className="w-5 h-5 text-[var(--primary)]" weight="fill" />
          ) : (
            <BellSlash className="w-5 h-5 text-[var(--text-muted)]" />
          )
        }
      />

      <p className="text-xs text-[var(--text-muted)]">
        These settings apply only to this club and override your global notification preferences.
      </p>

      <div className={cn("space-y-3 transition-opacity", !allEnabled && "opacity-50")}>
        {/* Festivals Section */}
        <NotificationSection
          title="Festivals"
          icon={<FilmSlate className="w-4 h-4" />}
          disabled={!allEnabled}
          allEnabled={allFestivalsEnabled}
          onToggleAll={toggleAllFestivals}
        >
          <NotificationToggle
            id="club-newFestivals"
            label="New festivals"
            description="When a new festival is created"
            checked={preferences.newFestivals}
            onCheckedChange={(checked) => updatePreference("newFestivals", checked)}
            disabled={isPending || !allEnabled}
          />
          <NotificationToggle
            id="club-festivalUpdates"
            label="Festival updates"
            description="General festival updates and changes"
            checked={preferences.festivalUpdates}
            onCheckedChange={(checked) => updatePreference("festivalUpdates", checked)}
            disabled={isPending || !allEnabled}
          />
          <NotificationToggle
            id="club-newNominations"
            label="New nominations"
            description="When new movies are nominated"
            checked={preferences.newNominations}
            onCheckedChange={(checked) => updatePreference("newNominations", checked)}
            disabled={isPending || !allEnabled}
          />
          <NotificationToggle
            id="club-phaseChanges"
            label="Phase changes"
            description="When a festival advances to a new phase"
            checked={preferences.phaseChanges}
            onCheckedChange={(checked) => updatePreference("phaseChanges", checked)}
            disabled={isPending || !allEnabled}
          />
          <NotificationToggle
            id="club-deadlineChanges"
            label="Deadline changes"
            description="When festival deadlines are modified"
            checked={preferences.deadlineChanges}
            onCheckedChange={(checked) => updatePreference("deadlineChanges", checked)}
            disabled={isPending || !allEnabled}
          />
          <NotificationToggle
            id="club-resultsRevealed"
            label="Results revealed"
            description="When festival results become available"
            checked={preferences.resultsRevealed}
            onCheckedChange={(checked) => updatePreference("resultsRevealed", checked)}
            disabled={isPending || !allEnabled}
          />
        </NotificationSection>

        {/* Endless Festival Section */}
        <NotificationSection
          title="Endless Festival"
          icon={<FilmReel className="w-4 h-4" />}
          disabled={!allEnabled}
          allEnabled={preferences.endlessFestival}
          onToggleAll={(enabled) => updatePreference("endlessFestival", enabled)}
        >
          <NotificationToggle
            id="club-endlessFestival"
            label="Movie updates"
            description="When movies are added to pool or marked as concluded"
            checked={preferences.endlessFestival}
            onCheckedChange={(checked) => updatePreference("endlessFestival", checked)}
            disabled={isPending || !allEnabled}
          />
        </NotificationSection>

        {/* Club Updates Section */}
        <NotificationSection
          title="Club Updates"
          icon={<Users className="w-4 h-4" />}
          disabled={!allEnabled}
          allEnabled={allClubUpdatesEnabled}
          onToggleAll={toggleAllClubUpdates}
        >
          <NotificationToggle
            id="club-announcements"
            label="Announcements"
            description="New club announcements"
            checked={preferences.announcements}
            onCheckedChange={(checked) => updatePreference("announcements", checked)}
            disabled={isPending || !allEnabled}
          />
          <NotificationToggle
            id="club-clubUpdates"
            label="Club changes"
            description="Club name changes and other updates"
            checked={preferences.clubUpdates}
            onCheckedChange={(checked) => updatePreference("clubUpdates", checked)}
            disabled={isPending || !allEnabled}
          />
        </NotificationSection>

        {/* Events Section */}
        <NotificationSection
          title="Events"
          icon={<CalendarDots className="w-4 h-4" />}
          disabled={!allEnabled}
          allEnabled={preferences.events}
          onToggleAll={(enabled) => updatePreference("events", enabled)}
        >
          <NotificationToggle
            id="club-events"
            label="Event updates"
            description="New events, cancellations, and modifications"
            checked={preferences.events}
            onCheckedChange={(checked) => updatePreference("events", checked)}
            disabled={isPending || !allEnabled}
          />
        </NotificationSection>

        {/* Polls Section */}
        <NotificationSection
          title="Polls"
          icon={<ListBullets className="w-4 h-4" />}
          disabled={!allEnabled}
          allEnabled={preferences.polls}
          onToggleAll={(enabled) => updatePreference("polls", enabled)}
        >
          <NotificationToggle
            id="club-polls"
            label="New polls"
            description="When a new poll is created"
            checked={preferences.polls}
            onCheckedChange={(checked) => updatePreference("polls", checked)}
            disabled={isPending || !allEnabled}
          />
        </NotificationSection>

        {/* Seasons Section */}
        <NotificationSection
          title="Seasons"
          icon={<Trophy className="w-4 h-4" />}
          disabled={!allEnabled}
          allEnabled={preferences.seasons}
          onToggleAll={(enabled) => updatePreference("seasons", enabled)}
        >
          <NotificationToggle
            id="club-seasons"
            label="Season updates"
            description="Season start/end, date changes, and name changes"
            checked={preferences.seasons}
            onCheckedChange={(checked) => updatePreference("seasons", checked)}
            disabled={isPending || !allEnabled}
          />
        </NotificationSection>

        {/* Social Section */}
        <NotificationSection
          title="Social"
          icon={<Bell className="w-4 h-4" />}
          disabled={!allEnabled}
          allEnabled={allSocialEnabled}
          onToggleAll={toggleAllSocial}
        >
          <NotificationToggle
            id="club-mentions"
            label="Mentions"
            description="When someone mentions you in discussions"
            checked={preferences.mentions}
            onCheckedChange={(checked) => updatePreference("mentions", checked)}
            disabled={isPending || !allEnabled}
          />
          <NotificationToggle
            id="club-newMessages"
            label="New messages"
            description="New discussion replies and comments"
            checked={preferences.newMessages}
            onCheckedChange={(checked) => updatePreference("newMessages", checked)}
            disabled={isPending || !allEnabled}
          />
        </NotificationSection>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="pt-4 border-t border-[var(--border)]">
          <Button onClick={handleSave} disabled={isPending} variant="primary" size="sm">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
