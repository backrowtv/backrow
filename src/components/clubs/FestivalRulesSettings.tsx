"use client";

import { updateClubSettings, updateClub } from "@/app/actions/clubs";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/typography";
import { SettingsSection, SettingsRow, SettingsCard } from "@/components/ui/settings-section";
import { NumberStepper } from "@/components/ui/number-stepper";
import {
  Info,
  Users,
  Shuffle,
  Crown,
  Sparkle,
  CaretRight,
  FilmSlate,
  Trophy,
  FilmReel,
  MaskHappy,
  Lock,
  Timer,
  Confetti,
  SlidersHorizontal,
  Plus,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";
import type {
  ThemeGovernance,
  FestivalType,
  RatingRubric,
  RubricSliderIcon,
  RubricEnforcement,
  MoviePoolGovernance,
  ResultsRevealType,
  ResultsRevealDirection,
  PlacementPointsConfig,
  PlacementPoint,
  PlacementRule,
} from "@/types/club-settings";
import { PRESET_RUBRICS, createRubricsFromPreset } from "@/types/club-settings";
import { RubricEditor } from "@/components/ratings/RubricEditor";
import { SliderIconSelector } from "@/components/ratings/SliderIconSelector";

// =============================================================================
// HELPERS
// =============================================================================

function toOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** After changing a rule, cascade subsequent rules so `from` values don't overlap. */
function cascadeRules(rules: PlacementRule[]): PlacementRule[] {
  const result = [...rules];
  for (let i = 1; i < result.length; i++) {
    const prevEnd = result[i - 1].to;
    const needsFrom = prevEnd + 1;
    if (result[i].from < needsFrom) {
      const span = result[i].to - result[i].from; // preserve range width
      result[i] = {
        ...result[i],
        from: needsFrom,
        to: Math.max(needsFrom, needsFrom + span),
      };
    }
  }
  return result;
}

// =============================================================================
// TYPES
// =============================================================================

interface FestivalRulesSettingsProps {
  clubId: string;
  clubSlug?: string;
  settings: Record<string, unknown>;
  festivalType?: string;
  themeSubmissionsLocked?: boolean;
  festivalTypeLocked?: boolean;
}

// =============================================================================
// COMPACT RADIO OPTION
// =============================================================================

function CompactRadioOption({
  value,
  id,
  label,
  description,
  icon,
  isSelected,
  onClick,
  disabled,
}: {
  value: string;
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? "border-[var(--primary)] bg-[var(--surface-2)]" : "border-[var(--border)]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" disabled={disabled} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 text-[var(--text-secondary)]">{icon}</span>
          <Label htmlFor={id} className="text-xs font-medium cursor-pointer">
            {label}
          </Label>
        </div>
        <Text size="tiny" muted className="mt-0.5">
          {description}
        </Text>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FestivalRulesSettings({
  clubId,
  clubSlug: _clubSlug,
  settings,
  festivalType: _festivalType,
  themeSubmissionsLocked,
  festivalTypeLocked = false,
}: FestivalRulesSettingsProps) {
  // clubSlug is available for future use (e.g., linking to related pages)
  void _clubSlug;
  void _festivalType;
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [localSettings, setLocalSettings] = useState(settings);
  const [localThemeSubmissionsLocked, setLocalThemeSubmissionsLocked] = useState(
    themeSubmissionsLocked ?? false
  );

  // Derive state
  const festivalType = (localSettings.festival_type as FestivalType) || "standard";
  const scoringEnabled = (localSettings.scoring_enabled as boolean) ?? false;

  async function handleSave(options?: { confirmEndlessSwitch?: boolean }) {
    startTransition(async () => {
      // Save settings JSONB
      const result = await updateClubSettings(clubId, localSettings, options);
      if (result && "error" in result && result.error) {
        // Handle endless→standard confirmation flow
        if (result.error === "CONFIRM_ENDLESS_SWITCH") {
          const count = (result as { playingMovieCount?: number }).playingMovieCount ?? 0;
          const message =
            count > 0
              ? `You have ${count} movie${count === 1 ? "" : "s"} currently playing. Switching to standard will conclude them. Continue?`
              : "Switch to standard festival mode? Your endless festival will be concluded.";

          if (window.confirm(message)) {
            // Retry with confirmation
            handleSave({ confirmEndlessSwitch: true });
          } else {
            // Revert local state
            setLocalSettings((prev) => ({ ...prev, festival_type: "endless" }));
          }
          return;
        }

        toast.error(result.error);
        return;
      }

      // Save theme_submissions_locked if it changed
      if (localThemeSubmissionsLocked !== themeSubmissionsLocked) {
        const formData = new FormData();
        formData.append("clubId", clubId);
        formData.append("themeSubmissionsLocked", localThemeSubmissionsLocked ? "on" : "off");
        const lockResult = await updateClub(null, formData);
        if (lockResult && "error" in lockResult && lockResult.error) {
          toast.error(lockResult.error);
          return;
        }
      }

      toast.success("Settings saved");
      router.refresh();
    });
  }

  const updateSetting = (key: string, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  /** Update placement rules using functional updater to always read latest state. */
  const updateRules = (updater: (rules: PlacementRule[]) => PlacementRule[]) => {
    setLocalSettings((prev) => {
      const current = prev.placement_points as PlacementPointsConfig | undefined;
      const currentRules = current?.rules || [];
      return {
        ...prev,
        placement_points: {
          type: "custom" as const,
          rules: cascadeRules(updater(currentRules)),
        },
      };
    });
  };

  // Settings values
  const themesEnabled = (localSettings.themes_enabled as boolean) ?? true;
  const themeGovernance = (localSettings.theme_governance as ThemeGovernance) || "democracy";
  const themeVotingEnabled = (localSettings.theme_voting_enabled as boolean) ?? true;
  const maxThemesPerUser = (localSettings.max_themes_per_user as number) ?? 5;
  const moviePoolEnabled = (localSettings.movie_pool_enabled as boolean) ?? true;
  const moviePoolVotingEnabled = (localSettings.movie_pool_voting_enabled as boolean) ?? true;
  const moviePoolGovernance =
    (localSettings.movie_pool_governance as MoviePoolGovernance) || "autocracy";
  const moviePoolAutoPromoteThreshold =
    (localSettings.movie_pool_auto_promote_threshold as number) ?? 5;
  const moviePoolMaxPerUser = (localSettings.movie_pool_max_per_user as number) ?? 5;
  const allowNonAdminMoviePool = (localSettings.allow_non_admin_movie_pool as boolean) ?? true;
  const maxNominationsPerUser = (localSettings.max_nominations_per_user as number) ?? 1;
  const maxNominationsPerFestival = localSettings.max_nominations_per_festival as
    | number
    | null
    | undefined;
  const festivalCapEnabled =
    maxNominationsPerFestival !== null && maxNominationsPerFestival !== undefined;
  const blindNominationsEnabled = (localSettings.blind_nominations_enabled as boolean) ?? false;
  const allowNonAdminNominations = (localSettings.allow_non_admin_nominations as boolean) ?? true;
  const ratingRubrics = (localSettings.rating_rubrics as RatingRubric[]) ?? [];
  const rubricSliderIcon =
    (localSettings.rating_rubric_slider_icon as RubricSliderIcon) ?? "default";

  // Placement Points settings
  const placementPoints = localSettings.placement_points as
    | PlacementPointsConfig
    | PlacementPoint[]
    | undefined;
  const placementPointsType = Array.isArray(placementPoints)
    ? "custom"
    : (placementPoints?.type ?? "default");

  // Derive rules for custom mode (convert legacy format if needed)
  const customRules: PlacementRule[] = (() => {
    if (!placementPoints || Array.isArray(placementPoints)) {
      // Legacy PlacementPoint[] → convert to PlacementRule[]
      const legacy = Array.isArray(placementPoints) ? placementPoints : [];
      return legacy.map((pp) => ({ from: pp.place, to: pp.place, points: pp.points ?? 0 }));
    }
    if (placementPoints.rules) return cascadeRules(placementPoints.rules);
    if (placementPoints.points) {
      return placementPoints.points.map((pp) => ({
        from: pp.place,
        to: pp.place,
        points: pp.points ?? 0,
      }));
    }
    return [];
  })();

  // Results Reveal settings
  const resultsRevealType = (localSettings.results_reveal_type as ResultsRevealType) ?? "manual";
  const resultsRevealDelay = (localSettings.results_reveal_delay_seconds as number) ?? 5;
  const resultsRevealDirection =
    (localSettings.results_reveal_direction as ResultsRevealDirection) ?? "backward";

  return (
    <div className="divide-y divide-[var(--border)]">
      {/* ================================================================== */}
      {/* SECTION 1: Festival Type */}
      {/* ================================================================== */}
      <SettingsSection
        title="Festival Type"
        description="Standard phases or continuous watching"
        icon={<FilmReel />}
        compact
      >
        <div className="space-y-3">
          {festivalTypeLocked && (
            <SettingsCard variant="warning" compact>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                <Text size="sm" style={{ color: "#f59e0b" }}>
                  A festival is running. Complete or cancel it to switch.
                </Text>
              </div>
            </SettingsCard>
          )}

          <RadioGroup
            value={festivalType}
            onValueChange={(value) => updateSetting("festival_type", value as FestivalType)}
            className="space-y-2"
            disabled={festivalTypeLocked}
          >
            <CompactRadioOption
              value="standard"
              id="type-standard"
              label="Standard Festival"
              description="Theme → Nomination → Watch & Rate → Results"
              icon={<FilmSlate />}
              isSelected={festivalType === "standard"}
              onClick={() => updateSetting("festival_type", "standard")}
              disabled={festivalTypeLocked}
            />
            <CompactRadioOption
              value="endless"
              id="type-endless"
              label="Endless Festival"
              description="Continuous watching without phases"
              icon={<FilmReel />}
              isSelected={festivalType === "endless"}
              onClick={() => updateSetting("festival_type", "endless")}
              disabled={festivalTypeLocked}
            />
          </RadioGroup>

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 2: Theme Pool */}
      {/* ================================================================== */}
      <SettingsSection
        title="Themes"
        description="How themes are selected for festivals"
        icon={<MaskHappy />}
        compact
      >
        <div className="space-y-3">
          <SettingsRow
            label="Enable Themes"
            description="When off, festivals use 'Open' theme"
            compact
          >
            <Checkbox
              checked={themesEnabled}
              onCheckedChange={(checked) => updateSetting("themes_enabled", checked)}
            />
          </SettingsRow>

          <div className={!themesEnabled ? "opacity-50 pointer-events-none" : ""}>
            <div className="pt-2 border-t border-[var(--border)]">
              <Label className="text-xs font-medium mb-2 block">Theme Selection</Label>
              <RadioGroup
                value={themeGovernance}
                onValueChange={(value) =>
                  updateSetting("theme_governance", value as ThemeGovernance)
                }
                className="space-y-1.5"
                disabled={!themesEnabled}
              >
                <CompactRadioOption
                  value="democracy"
                  id="gov-democracy"
                  label="Democracy"
                  description="Top-voted theme wins"
                  icon={<Users />}
                  isSelected={themeGovernance === "democracy"}
                  onClick={() => themesEnabled && updateSetting("theme_governance", "democracy")}
                />
                <CompactRadioOption
                  value="random"
                  id="gov-random"
                  label="Random"
                  description="Randomly selected"
                  icon={<Shuffle />}
                  isSelected={themeGovernance === "random"}
                  onClick={() => themesEnabled && updateSetting("theme_governance", "random")}
                />
                <CompactRadioOption
                  value="autocracy"
                  id="gov-autocracy"
                  label="Host Decides"
                  description="Admin selects theme"
                  icon={<Crown />}
                  isSelected={themeGovernance === "autocracy"}
                  onClick={() => themesEnabled && updateSetting("theme_governance", "autocracy")}
                />
              </RadioGroup>
            </div>

            <SettingsRow label="Theme Voting" description="Members can vote on themes" compact>
              <Checkbox
                checked={themeVotingEnabled}
                onCheckedChange={(checked) => updateSetting("theme_voting_enabled", checked)}
                disabled={!themesEnabled}
              />
            </SettingsRow>

            <SettingsRow
              label="Max Themes Per User"
              description="Themes each member can suggest"
              compact
            >
              <NumberStepper
                value={maxThemesPerUser}
                onChange={(v) => updateSetting("max_themes_per_user", v)}
                min={1}
                max={20}
              />
            </SettingsRow>

            <SettingsRow
              label="Lock Theme Submissions"
              description="Prevent new theme suggestions"
              compact
            >
              <Checkbox
                checked={localThemeSubmissionsLocked}
                onCheckedChange={(checked) => setLocalThemeSubmissionsLocked(checked === true)}
                disabled={!themesEnabled}
              />
            </SettingsRow>
          </div>

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 4: Movie Pool */}
      {/* ================================================================== */}
      <SettingsSection
        title="Movie Pool"
        description="Suggest and promote movies"
        icon={<FilmReel />}
        compact
      >
        <div className="space-y-3">
          <SettingsRow label="Enable Movie Pool" description="Queue of suggested movies" compact>
            <Checkbox
              checked={moviePoolEnabled}
              onCheckedChange={(checked) => updateSetting("movie_pool_enabled", checked)}
            />
          </SettingsRow>

          <div className={!moviePoolEnabled ? "opacity-50 pointer-events-none" : ""}>
            <SettingsRow
              label="Members Can Add Movies"
              description="When off, only admins can add"
              compact
            >
              <Checkbox
                checked={allowNonAdminMoviePool}
                onCheckedChange={(checked) => updateSetting("allow_non_admin_movie_pool", checked)}
                disabled={!moviePoolEnabled}
              />
            </SettingsRow>

            <SettingsRow
              label="Max Movies Per User"
              description="Movies each member can add to the pool"
              compact
            >
              <NumberStepper
                value={moviePoolMaxPerUser}
                onChange={(v) => updateSetting("movie_pool_max_per_user", v)}
                min={1}
                max={20}
              />
            </SettingsRow>

            <SettingsRow
              label="Enable Voting"
              description="Members can vote on pool movies"
              compact
            >
              <Checkbox
                checked={moviePoolVotingEnabled}
                onCheckedChange={(checked) => updateSetting("movie_pool_voting_enabled", checked)}
                disabled={!moviePoolEnabled}
              />
            </SettingsRow>

            <div className="pt-2 border-t border-[var(--border)]">
              <Label className="text-xs font-medium mb-2 block">Movie Selection</Label>
              <RadioGroup
                value={moviePoolGovernance}
                onValueChange={(value) =>
                  moviePoolEnabled &&
                  updateSetting("movie_pool_governance", value as MoviePoolGovernance)
                }
                className="space-y-1.5"
                disabled={!moviePoolEnabled}
              >
                <CompactRadioOption
                  value="democracy"
                  id="movie-gov-democracy"
                  label="Members Vote"
                  description="Most popular auto-starts"
                  icon={<Users />}
                  isSelected={moviePoolGovernance === "democracy"}
                  onClick={() =>
                    moviePoolEnabled && updateSetting("movie_pool_governance", "democracy")
                  }
                />
                <CompactRadioOption
                  value="autocracy"
                  id="movie-gov-autocracy"
                  label="Host Decides"
                  description="Admins pick what's next"
                  icon={<Crown />}
                  isSelected={moviePoolGovernance === "autocracy"}
                  onClick={() =>
                    moviePoolEnabled && updateSetting("movie_pool_governance", "autocracy")
                  }
                />
                <CompactRadioOption
                  value="random"
                  id="movie-gov-random"
                  label="Random"
                  description="Random selection"
                  icon={<Shuffle />}
                  isSelected={moviePoolGovernance === "random"}
                  onClick={() =>
                    moviePoolEnabled && updateSetting("movie_pool_governance", "random")
                  }
                />
              </RadioGroup>
            </div>

            {moviePoolGovernance === "democracy" && moviePoolVotingEnabled && (
              <SettingsRow
                label="Auto-Promote Threshold"
                description="Votes needed to auto-start"
                compact
              >
                <NumberStepper
                  value={moviePoolAutoPromoteThreshold}
                  onChange={(v) => updateSetting("movie_pool_auto_promote_threshold", v)}
                  min={1}
                  max={50}
                />
              </SettingsRow>
            )}
          </div>

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 5: Nominations */}
      {/* ================================================================== */}
      <SettingsSection
        title="Nominations"
        description="Movie nomination rules"
        icon={<FilmSlate />}
        compact
      >
        <div className="space-y-3">
          <SettingsRow label="Nominations Per User" compact>
            <NumberStepper
              value={maxNominationsPerUser}
              onChange={(v) => updateSetting("max_nominations_per_user", v)}
              min={1}
              max={10}
            />
          </SettingsRow>

          <SettingsRow
            label="All Members Can Nominate"
            description="When off, only admins can nominate"
            compact
          >
            <Checkbox
              checked={allowNonAdminNominations}
              onCheckedChange={(checked) => updateSetting("allow_non_admin_nominations", checked)}
            />
          </SettingsRow>

          <div className="pt-2 border-t border-[var(--border)]">
            <SettingsRow
              label="Festival Nomination Cap"
              description="Limit total movies per festival"
              compact
            >
              <Checkbox
                checked={festivalCapEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateSetting("max_nominations_per_festival", 5);
                  } else {
                    updateSetting("max_nominations_per_festival", null);
                  }
                }}
              />
            </SettingsRow>
            {festivalCapEnabled && (
              <div className="mt-2 flex items-center justify-end">
                <NumberStepper
                  value={maxNominationsPerFestival || 5}
                  onChange={(v) => updateSetting("max_nominations_per_festival", v)}
                  min={1}
                  max={50}
                />
              </div>
            )}
          </div>

          <SettingsRow
            label="Blind Nominations"
            description="Hide who nominated until results"
            compact
          >
            <Checkbox
              checked={blindNominationsEnabled}
              onCheckedChange={(checked) => updateSetting("blind_nominations_enabled", checked)}
            />
          </SettingsRow>

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 6: Rubrics */}
      {/* ================================================================== */}
      <SettingsSection
        title="Rating Rubrics"
        description="Weighted categories for ratings"
        icon={<Sparkle />}
        compact
      >
        <div className="space-y-3">
          <RadioGroup
            value={(localSettings.rubric_enforcement as RubricEnforcement) || "off"}
            onValueChange={(value) =>
              updateSetting("rubric_enforcement", value as RubricEnforcement)
            }
            className="space-y-1.5"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="off" id="rubric-off" className="mt-0.5" />
              <div>
                <Label htmlFor="rubric-off" className="text-xs cursor-pointer">
                  Off
                </Label>
                <Text size="tiny" muted>
                  Simple ratings only
                </Text>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="suggested" id="rubric-suggested" className="mt-0.5" />
              <div>
                <Label htmlFor="rubric-suggested" className="text-xs cursor-pointer">
                  Suggested
                </Label>
                <Text size="tiny" muted>
                  Members can use their own
                </Text>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="required" id="rubric-required" className="mt-0.5" />
              <div>
                <Label htmlFor="rubric-required" className="text-xs cursor-pointer">
                  Required
                </Label>
                <Text size="tiny" muted>
                  All must use club rubric
                </Text>
              </div>
            </div>
          </RadioGroup>

          {((localSettings.rubric_enforcement as RubricEnforcement) === "suggested" ||
            (localSettings.rubric_enforcement as RubricEnforcement) === "required") && (
            <>
              {(!ratingRubrics || ratingRubrics.length === 0) && (
                <SettingsCard compact>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkle className="h-4 w-4" style={{ color: "var(--primary)" }} />
                    <Text className="text-xs font-medium">Start with a Template</Text>
                  </div>
                  <div className="space-y-1.5">
                    {PRESET_RUBRICS.slice(0, 3).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          const newRubrics = createRubricsFromPreset(preset);
                          updateSetting("rating_rubrics", newRubrics);
                          updateSetting("rating_rubric_name", preset.name);
                        }}
                        className="flex items-center justify-between w-full p-2 rounded-lg border text-left transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--primary)]"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--background)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <Text size="sm" className="font-medium">
                            {preset.name}
                          </Text>
                          <Text size="tiny" muted>
                            {preset.description}
                          </Text>
                        </div>
                        <CaretRight
                          className="h-3.5 w-3.5 flex-shrink-0 ml-2"
                          style={{ color: "var(--text-muted)" }}
                        />
                      </button>
                    ))}
                  </div>
                </SettingsCard>
              )}

              <RubricEditor
                rubrics={ratingRubrics}
                rubricName={(localSettings.rating_rubric_name as string) || ""}
                onChange={(updatedRubrics) => updateSetting("rating_rubrics", updatedRubrics)}
                onNameChange={(name) => updateSetting("rating_rubric_name", name)}
              />

              {ratingRubrics.length > 0 && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <SliderIconSelector
                    value={rubricSliderIcon}
                    onChange={(icon) => updateSetting("rating_rubric_slider_icon", icon)}
                  />
                </div>
              )}
            </>
          )}

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 7: Competition */}
      {/* ================================================================== */}
      <SettingsSection
        title="Competition"
        description="Scoring and standings"
        icon={<Trophy />}
        compact
      >
        <div className="space-y-3">
          <SettingsRow
            label="Enable Scoring"
            description="Award points based on movie placement"
            compact
          >
            <Checkbox
              checked={scoringEnabled}
              onCheckedChange={(checked) => updateSetting("scoring_enabled", checked)}
            />
          </SettingsRow>

          <SettingsRow
            label="Season Standings"
            description="Track points across the season"
            compact
          >
            <Checkbox
              checked={(localSettings.season_standings_enabled as boolean) ?? true}
              onCheckedChange={(checked) => updateSetting("season_standings_enabled", checked)}
            />
          </SettingsRow>

          <SettingsRow
            label="Festival Winner"
            description="Announce the winning movie at results"
            compact
          >
            <Checkbox
              checked={(localSettings.festival_winner_enabled as boolean) ?? true}
              onCheckedChange={(checked) => updateSetting("festival_winner_enabled", checked)}
            />
          </SettingsRow>

          {/* Nomination Guessing */}
          <div className="pt-3 mt-1 border-t border-[var(--border)]">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
              Nomination Guessing
            </h4>

            {!blindNominationsEnabled ? (
              <SettingsCard variant="info" compact>
                <div className="flex items-start gap-1.5">
                  <Info
                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                    style={{ color: "var(--primary)" }}
                  />
                  <Text size="sm" muted>
                    Requires <strong>Blind Nominations</strong> to be enabled in the Nominations
                    section.
                  </Text>
                </div>
              </SettingsCard>
            ) : (
              <>
                <SettingsRow
                  label="Enable Guessing"
                  description="Members guess who nominated each movie"
                  compact
                >
                  <Checkbox
                    checked={(localSettings.nomination_guessing_enabled as boolean) ?? false}
                    onCheckedChange={(checked) =>
                      updateSetting("nomination_guessing_enabled", checked)
                    }
                  />
                </SettingsRow>

                {(localSettings.nomination_guessing_enabled as boolean) && (
                  <SettingsRow
                    label="Guessing Deadline"
                    description="Days to submit guesses (0 = until results)"
                    compact
                  >
                    <NumberStepper
                      value={(localSettings.guessing_deadline_days as number) ?? 7}
                      onChange={(v) => updateSetting("guessing_deadline_days", v)}
                      min={0}
                      max={14}
                    />
                  </SettingsRow>
                )}
              </>
            )}
          </div>

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 8: Scoring Points */}
      {/* ================================================================== */}
      <SettingsSection
        title="Scoring Points"
        description="How points are awarded for placements"
        icon={<SlidersHorizontal />}
        compact
      >
        <div className="space-y-3">
          <RadioGroup
            value={placementPointsType}
            onValueChange={(value) => {
              if (value === "default") {
                updateSetting("placement_points", { type: "default" });
              } else if (value === "custom") {
                updateSetting("placement_points", {
                  type: "custom",
                  rules: [
                    { from: 1, to: 1, points: 10 },
                    { from: 2, to: 2, points: 7 },
                    { from: 3, to: 3, points: 5 },
                    { from: 4, to: 4, points: 3 },
                    { from: 5, to: 5, points: 1 },
                  ],
                });
              }
            }}
            className="space-y-2"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="default" id="points-default" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="points-default" className="text-sm cursor-pointer">
                  Linear
                </Label>
                <Text size="tiny" muted>
                  1st = N pts, 2nd = N-1, down to 1 pt for last
                </Text>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)]">
                    1st → 5
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)]">
                    2nd → 4
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)]">
                    3rd → 3
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">...</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)]">
                    5th → 1
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="custom" id="points-custom" className="mt-0.5" />
              <div>
                <Label htmlFor="points-custom" className="text-sm cursor-pointer">
                  Custom
                </Label>
                <Text size="tiny" muted>
                  Define point values per placement or range
                </Text>
              </div>
            </div>
          </RadioGroup>

          {placementPointsType === "custom" && customRules.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                {customRules.map((rule, index) => {
                  const isRange = rule.from !== rule.to;

                  return (
                    <div
                      key={index}
                      className={`group px-4 py-3 sm:py-3.5 hover:bg-[var(--surface-1)] transition-colors ${
                        isRange
                          ? "flex flex-col gap-2 sm:flex-row sm:items-center"
                          : "flex items-center justify-between"
                      }`}
                    >
                      {/* Placement label — fixed width on desktop for column alignment */}
                      <div className="sm:min-w-[16rem] flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                        <span className="min-w-[2.5rem] tabular-nums">{toOrdinal(rule.from)}</span>
                        {isRange ? (
                          <>
                            <span className="text-[var(--text-muted)] font-normal text-xs">to</span>
                            <NumberStepper
                              value={rule.to}
                              onChange={(v) => {
                                updateRules((rules) => {
                                  const updated = [...rules];
                                  updated[index] = {
                                    ...updated[index],
                                    to: Math.max(updated[index].from + 1, v),
                                  };
                                  return updated;
                                });
                              }}
                              min={rule.from + 1}
                              max={99}
                              format={toOrdinal}
                            />
                            <span className="text-[var(--text-muted)] font-normal">place</span>
                          </>
                        ) : (
                          <span className="text-[var(--text-muted)] font-normal">place</span>
                        )}
                      </div>

                      {/* Points + menu — pushed right */}
                      <div className="flex items-center gap-2.5 ml-auto">
                        <NumberStepper
                          value={rule.points}
                          onChange={(v) => {
                            updateRules((rules) => {
                              const updated = [...rules];
                              updated[index] = { ...updated[index], points: v };
                              return updated;
                            });
                          }}
                          min={0}
                          max={1000}
                        />
                        <span className="text-xs text-[var(--text-muted)] min-w-[1.5rem]">
                          {rule.points === 1 ? "pt" : "pts"}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1.5 rounded sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 hover:bg-[var(--surface-2)] text-[var(--text-muted)] sm:transition-opacity"
                            >
                              <DotsThreeVertical className="w-4 h-4" weight="bold" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {!isRange ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  updateRules((rules) => {
                                    const updated = [...rules];
                                    updated[index] = {
                                      ...updated[index],
                                      to: updated[index].from + 1,
                                    };
                                    return updated;
                                  });
                                }}
                              >
                                Expand to range
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  updateRules((rules) => {
                                    const updated = [...rules];
                                    updated[index] = { ...updated[index], to: updated[index].from };
                                    return updated;
                                  });
                                }}
                              >
                                Collapse to single
                              </DropdownMenuItem>
                            )}
                            {customRules.length > 1 && (
                              <DropdownMenuItem
                                className="text-[var(--destructive)]"
                                onClick={() => {
                                  updateRules((rules) => rules.filter((_, i) => i !== index));
                                }}
                              >
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  updateRules((rules) => {
                    const lastRule = rules[rules.length - 1];
                    const nextFrom = lastRule ? lastRule.to + 1 : 1;
                    return [...rules, { from: nextFrom, to: nextFrom, points: 0 }];
                  });
                }}
                className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add rule
              </button>

              <Text size="tiny" muted className="mt-2">
                Unassigned placements receive 0 pts.
              </Text>
            </div>
          )}

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 10: Results Reveal */}
      {/* ================================================================== */}
      <SettingsSection
        title="Results Reveal"
        description="How festival results are presented"
        icon={<Confetti />}
        compact
      >
        <div className="space-y-3">
          <RadioGroup
            value={resultsRevealType}
            onValueChange={(value) =>
              updateSetting("results_reveal_type", value as ResultsRevealType)
            }
            className="space-y-1.5"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="manual" id="reveal-manual" className="mt-0.5" />
              <div>
                <Label htmlFor="reveal-manual" className="text-sm cursor-pointer">
                  Manual
                </Label>
                <Text size="tiny" muted>
                  Click to reveal each placement
                </Text>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="automatic" id="reveal-automatic" className="mt-0.5" />
              <div>
                <Label htmlFor="reveal-automatic" className="text-sm cursor-pointer">
                  Automatic
                </Label>
                <Text size="tiny" muted>
                  Results reveal on a timer
                </Text>
              </div>
            </div>
          </RadioGroup>

          {resultsRevealType === "automatic" && (
            <SettingsRow
              label="Delay Between Reveals"
              description="Seconds between each placement"
              compact
            >
              <NumberStepper
                value={resultsRevealDelay}
                onChange={(v) => updateSetting("results_reveal_delay_seconds", v)}
                min={1}
                max={30}
              />
            </SettingsRow>
          )}

          <div className="pt-2 border-t border-[var(--border)]">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Reveal Order</h4>
            <RadioGroup
              value={resultsRevealDirection}
              onValueChange={(value) =>
                updateSetting("results_reveal_direction", value as ResultsRevealDirection)
              }
              className="space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="backward" id="direction-backward" />
                <Label htmlFor="direction-backward" className="text-sm cursor-pointer">
                  Last to First (build suspense)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="forward" id="direction-forward" />
                <Label htmlFor="direction-forward" className="text-sm cursor-pointer">
                  First to Last (winner first)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* SECTION 11: Phase Timing */}
      {/* ================================================================== */}
      <SettingsSection
        title="Phase Timing"
        description="Automatic phase advancement"
        icon={<Timer />}
        compact
      >
        <div className="space-y-3">
          <SettingsCard variant="info" compact>
            <div className="flex items-start gap-1.5">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
              <Text size="sm" muted>
                Phase timing is configured when creating or editing individual festivals. These
                defaults apply to new festivals.
              </Text>
            </div>
          </SettingsCard>

          <SettingsRow
            label="Auto-Start Next Festival"
            description="Automatically begin a new festival after results"
            compact
          >
            <Checkbox
              checked={(localSettings.auto_start_next_festival as boolean) ?? false}
              onCheckedChange={(checked) => updateSetting("auto_start_next_festival", checked)}
            />
          </SettingsRow>

          <Button onClick={() => handleSave()} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
