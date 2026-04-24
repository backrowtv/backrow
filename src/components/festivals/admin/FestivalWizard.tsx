"use client";

import React from "react";
import { createFestival } from "@/app/actions/festivals";
import { useActionState, useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import type { DefaultPhaseDuration } from "@/types/club-settings";
import toast from "react-hot-toast";
import {
  Calendar,
  Gear,
  Eye,
  FilmReel,
  Sparkle,
  Crown,
  Shuffle,
  UsersThree,
  Clock,
  Check,
  CaretRight,
  CaretLeft,
  PencilSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { NOMINATION_OPTIONS } from "@/lib/constants/ui";

type Season = Database["public"]["Tables"]["seasons"]["Row"];
type Theme = Database["public"]["Tables"]["theme_pool"]["Row"];

interface FestivalWizardProps {
  seasons: Season[];
  themes: Theme[];
  clubId: string;
  defaultMode?: string;
  onSuccess?: () => void;
  /** Club-level default phase durations to pre-populate dates */
  clubSettings?: {
    default_nomination_duration?: DefaultPhaseDuration;
    default_watch_rate_duration?: DefaultPhaseDuration;
    theme_governance?: "democracy" | "random" | "autocracy";
    themes_enabled?: boolean;
    rubric_enforcement?: "off" | "suggested" | "required";
    nomination_guessing_enabled?: boolean;
  };
}

const STEP_CONFIG = [
  {
    id: "timing",
    title: "Timeline",
    description: "Set your festival schedule",
    icon: Calendar,
  },
  {
    id: "rules",
    title: "Rules & Features",
    description: "Configure nominations and themes",
    icon: Gear,
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm and create your festival",
    icon: Eye,
  },
];

/**
 * Add a duration to a date
 */
function addDuration(date: Date, duration: DefaultPhaseDuration): Date {
  const result = new Date(date);
  const { value, unit } = duration;

  if (unit === "days") {
    result.setDate(result.getDate() + value);
  } else if (unit === "weeks") {
    result.setDate(result.getDate() + value * 7);
  } else if (unit === "months") {
    result.setMonth(result.getMonth() + value);
  }

  return result;
}

/**
 * Format a Date to datetime-local input value
 */
function formatDateTimeForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format a datetime-local string for display
 */
function formatDateTimeForDisplay(dtString: string): string {
  if (!dtString) return "Not set";
  const [datePart, timePart] = dtString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${months[month - 1]} ${day}, ${year} at ${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

const THEME_GOVERNANCE_OPTIONS = [
  {
    value: "democracy" as const,
    label: "Democracy",
    description: "Top-voted theme is automatically selected",
    icon: UsersThree,
  },
  {
    value: "random" as const,
    label: "Random",
    description: "A random theme is selected from the pool",
    icon: Shuffle,
  },
  {
    value: "autocracy" as const,
    label: "Autocracy",
    description: "Admin manually selects the theme",
    icon: Crown,
  },
] as const;

export function FestivalWizard({
  seasons,
  themes: _themes,
  clubId,
  defaultMode = "standard",
  onSuccess,
  clubSettings,
}: FestivalWizardProps) {
  const [state, formAction, isPending] = useActionState(createFestival, null);
  const [, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Use the club accent CSS variable set by the club layout
  const accentBg = "var(--club-accent, var(--primary))";

  // Festival type comes from club settings (defaultMode prop)
  const _festivalType = defaultMode;

  // Step 1: Timing
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [startImmediately, setStartImmediately] = useState(true);
  const [startDateTime, setStartDateTime] = useState<string>("");
  const [nominationDateTime, setNominationDateTime] = useState<string>("");
  const [ratingDeadline, setRatingDeadline] = useState<string>("");
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Step 2: Rules
  const [maxNominationsPerUser, setMaxNominationsPerUser] = useState(1);
  const [isCustomNominations, setIsCustomNominations] = useState(false);
  const [themeGovernance, setThemeGovernance] = useState<"democracy" | "random" | "autocracy">(
    clubSettings?.theme_governance ?? "democracy"
  );
  const [customTheme, setCustomTheme] = useState("");

  // Step 3: Picture
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const pictureFileInputRef = useRef<HTMLInputElement>(null);

  // Find active season
  const now = new Date();
  const activeSeason = seasons.find((season) => {
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    return start <= now && end >= now;
  });

  // Set default season
  useEffect(() => {
    const defaultSeasonId = activeSeason?.id || (seasons.length > 0 ? seasons[0].id : "");
    if (defaultSeasonId && !selectedSeasonId) {
      setSelectedSeasonId(defaultSeasonId);
    }
  }, [activeSeason, seasons, selectedSeasonId]);

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  // Set default dates based on selected season and club settings
  useEffect(() => {
    if (selectedSeason) {
      const startDateStr = selectedSeason.start_date.split("T")[0];
      const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);
      const start = new Date(startYear, startMonth - 1, startDay, 0, 0);

      const now = new Date();
      const defaultStart = startImmediately ? now : start;

      // Calculate nomination deadline using club default or fallback to 72 hours
      let nominationEnd: Date;
      if (clubSettings?.default_nomination_duration) {
        nominationEnd = addDuration(defaultStart, clubSettings.default_nomination_duration);
      } else {
        // Fallback: 72 hours from start
        nominationEnd = new Date(defaultStart.getTime() + 3 * 24 * 60 * 60 * 1000);
      }

      // Calculate rating deadline using club default (from nomination close) or fallback to 1 month
      let ratingEnd: Date;
      if (clubSettings?.default_watch_rate_duration) {
        ratingEnd = addDuration(nominationEnd, clubSettings.default_watch_rate_duration);
      } else {
        // Fallback: 1 month from nomination close
        ratingEnd = addDuration(nominationEnd, { value: 1, unit: "months" });
      }

      setStartDateTime(formatDateTimeForInput(defaultStart));
      setNominationDateTime(formatDateTimeForInput(nominationEnd));
      setRatingDeadline(formatDateTimeForInput(ratingEnd));
    }
  }, [selectedSeason, startImmediately, clubSettings]);

  // Track previous error to show toast and prevent premature closing
  const prevErrorRef = useRef<string | null>(null);

  // Handle errors and success
  useEffect(() => {
    if (state && "error" in state && state.error) {
      // Show toast for errors (ensures user sees it even if modal has issues)
      if (state.error !== prevErrorRef.current) {
        toast.error(state.error, { duration: 5000 });
        prevErrorRef.current = state.error;
      }
    } else if (state && !state.error && onSuccess) {
      // Only close on genuine success (no error present)
      // Note: createFestival uses redirect() on success, so this may not fire
      // But we keep it as a safety net
      setTimeout(() => {
        onSuccess();
      }, 100);
    }
  }, [state, onSuccess]);

  const canGoNext = () => {
    if (currentStep === 0) {
      // Timeline step - require all date fields
      return !!selectedSeasonId && !!startDateTime && !!nominationDateTime && !!ratingDeadline;
    }
    if (currentStep === 1) {
      // Rules step - require theme if autocracy
      if (
        themeGovernance === "autocracy" &&
        clubSettings?.themes_enabled !== false &&
        !customTheme.trim()
      ) {
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < STEP_CONFIG.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateFestival = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      startTransition(() => {
        formAction(formData);
      });
    }
  };

  const currentStepConfig = STEP_CONFIG[currentStep];
  const CurrentIcon = currentStepConfig.icon;

  // Theme display for review step
  const getThemeDisplayText = () => {
    if (clubSettings?.themes_enabled === false) return "Themes disabled (Open)";
    if (themeGovernance === "democracy") return "Top-voted theme will be selected";
    if (themeGovernance === "random") return "A random theme will be selected";
    if (themeGovernance === "autocracy") {
      return `"${customTheme}"`;
    }
    return "Not set";
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="min-w-0 flex flex-col"
      style={{ minHeight: 420 }}
    >
      {/* Hidden form fields */}
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="themeId" value="" />
      <input type="hidden" name="autoAdvance" value={autoAdvance.toString()} />
      <input type="hidden" name="seasonId" value={selectedSeasonId} />
      <input type="hidden" name="startDateTime" value={startDateTime} />
      <input type="hidden" name="nominationDeadline" value={nominationDateTime} />
      <input type="hidden" name="ratingDeadline" value={ratingDeadline} />
      <input type="hidden" name="watchDeadline" value={ratingDeadline} />
      <input type="hidden" name="startDate" value={startDateTime.split("T")[0] || ""} />
      <input type="hidden" name="keywords" value={JSON.stringify([])} />
      <input type="hidden" name="theme_governance" value={themeGovernance} />
      <input type="hidden" name="custom_theme" value={customTheme} />
      <input
        type="hidden"
        name="max_nominations_per_user"
        value={maxNominationsPerUser.toString()}
      />

      {state && "error" in state && state.error && (
        <div
          className="rounded-lg p-4 text-sm border flex items-start gap-3 sticky top-0 z-10 mb-4"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderColor: "rgba(239, 68, 68, 0.4)",
          }}
        >
          <WarningCircle className="w-5 h-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-500">Failed to create festival</p>
            <p className="mt-1" style={{ color: "var(--text-primary)" }}>
              {state.error}
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEP_CONFIG.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          const isClickable = index <= currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => isClickable && setCurrentStep(index)}
                disabled={!isClickable || isPending}
                className={`flex flex-col items-center gap-2 transition-all duration-200 ${
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    isActive ? "scale-110 shadow-lg" : isComplete ? "scale-100" : "scale-95"
                  }`}
                  style={{
                    backgroundColor: isActive || isComplete ? accentBg : "var(--surface-1)",
                    borderColor: isActive || isComplete ? accentBg : "var(--border)",
                  }}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                  ) : (
                    <StepIcon
                      className="w-5 h-5"
                      style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
                    />
                  )}
                </div>
                <div className="text-center hidden sm:block">
                  <p
                    className={`text-xs font-medium ${isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
                  >
                    {step.title}
                  </p>
                </div>
              </button>

              {index < STEP_CONFIG.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2 transition-colors duration-300"
                  style={{
                    backgroundColor: index < currentStep ? accentBg : "var(--border)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current Step Header */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <CurrentIcon className="w-4 h-4" style={{ color: "var(--text-primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Step {currentStep + 1} of {STEP_CONFIG.length}
          </span>
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {currentStepConfig.title}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {currentStepConfig.description}
        </p>
      </div>

      {/* Step content area - flex-1 to fill available space for consistent height */}
      <div className="flex-1 space-y-6">
        {/* Step 1: Timeline */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {/* Season Selection */}
            {seasons.length > 1 && (
              <div>
                <Select
                  id="seasonId"
                  label="Season"
                  required
                  disabled={isPending}
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                >
                  {seasons.map((season) => {
                    const formatDate = (dateString: string) => {
                      const dateStr = dateString.split("T")[0];
                      const [_year, monthNum, day] = dateStr.split("-").map(Number);
                      const months = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ];
                      return `${months[monthNum - 1]} ${day}`;
                    };
                    const isActive = (() => {
                      const now = new Date();
                      const dateStr = season.start_date.split("T")[0];
                      const [startYear, startMonth, startDay] = dateStr.split("-").map(Number);
                      const start = new Date(startYear, startMonth - 1, startDay);
                      const endStr = season.end_date.split("T")[0];
                      const [endYear, endMonth, endDay] = endStr.split("-").map(Number);
                      const end = new Date(endYear, endMonth - 1, endDay);
                      return start <= now && end >= now;
                    })();
                    return (
                      <option key={season.id} value={season.id}>
                        {season.name} {isActive && "(Active)"} · {formatDate(season.start_date)} -{" "}
                        {formatDate(season.end_date)}
                      </option>
                    );
                  })}
                </Select>
              </div>
            )}

            {/* Date Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Start Time - Inline editable */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Starts
                </p>
                {startImmediately ? (
                  <button
                    type="button"
                    onClick={() => setStartImmediately(false)}
                    disabled={isPending}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md border text-left hover:bg-[var(--surface-2)] transition-colors"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
                  >
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      Now
                    </span>
                    <PencilSimple className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="startDateTime"
                      type="datetime-local"
                      required
                      disabled={isPending}
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setStartImmediately(true)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-md text-xs font-medium hover:bg-[var(--surface-2)] transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Now
                    </button>
                  </div>
                )}
              </div>

              <Input
                id="nominationDeadline"
                type="datetime-local"
                label="Nominations Close"
                required
                disabled={isPending}
                value={nominationDateTime}
                onChange={(e) => setNominationDateTime(e.target.value)}
              />
            </div>

            <Input
              id="ratingDeadline"
              type="datetime-local"
              label="Ratings Close"
              helperText="Results reveal automatically after this deadline"
              required
              disabled={isPending}
              value={ratingDeadline}
              onChange={(e) => setRatingDeadline(e.target.value)}
            />

            {/* Auto-Advance */}
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <label
                htmlFor="festival-auto-advance"
                aria-label="Auto-advance phases"
                className="flex items-center gap-3 cursor-pointer py-2"
              >
                <input
                  id="festival-auto-advance"
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  disabled={isPending}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: accentBg }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                      Auto-advance phases
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Automatically move to the next phase when deadlines pass
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Rules & Features */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Nominations */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FilmReel className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  Nominations
                </h3>
              </div>

              <div>
                <p
                  className="text-sm font-medium mb-2 block"
                  style={{ color: "var(--text-primary)" }}
                >
                  Max nominations per member
                </p>
                <div className="flex items-center gap-3">
                  {NOMINATION_OPTIONS.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setMaxNominationsPerUser(num);
                        setIsCustomNominations(false);
                      }}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        maxNominationsPerUser === num && !isCustomNominations
                          ? "scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{
                        backgroundColor:
                          maxNominationsPerUser === num && !isCustomNominations
                            ? accentBg
                            : "var(--surface-2)",
                        color:
                          maxNominationsPerUser === num && !isCustomNominations
                            ? "white"
                            : "var(--text-primary)",
                      }}
                    >
                      {num}
                    </button>
                  ))}
                  {isCustomNominations ? (
                    <input
                      type="number"
                      min={1}
                      max={20}
                      /* focus-on-open dialog — expected UX */
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      defaultValue={maxNominationsPerUser}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= 20) {
                          setMaxNominationsPerUser(val);
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val) || val < 1) {
                          e.target.value = "1";
                          setMaxNominationsPerUser(1);
                          setIsCustomNominations(false);
                        } else if (NOMINATION_OPTIONS.includes(val as 1 | 2 | 3)) {
                          setMaxNominationsPerUser(val);
                          setIsCustomNominations(false);
                        }
                      }}
                      disabled={isPending}
                      className="w-16 h-10 rounded-lg font-medium text-sm text-center border-0 outline-none focus:ring-2 focus:ring-inset"
                      style={{
                        backgroundColor: accentBg,
                        color: "white",
                        // @ts-expect-error CSS variable
                        "--tw-ring-color": accentBg,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomNominations(true);
                        setMaxNominationsPerUser(4);
                      }}
                      className="h-10 px-3 rounded-lg font-medium text-sm transition-all hover:scale-105"
                      style={{
                        backgroundColor: "var(--surface-2)",
                        color: "var(--text-primary)",
                      }}
                    >
                      Custom
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Theme Selection */}
            {clubSettings?.themes_enabled !== false && (
              <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <Sparkle className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Theme Selection
                  </h3>
                </div>

                <div className="flex flex-col gap-2">
                  {THEME_GOVERNANCE_OPTIONS.map((option) => {
                    const OptionIcon = option.icon;
                    const isSelected = themeGovernance === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setThemeGovernance(option.value)}
                        disabled={isPending}
                        className="flex items-center gap-3 px-4 py-3 h-16 rounded-lg border transition-all text-left"
                        style={{
                          backgroundColor: isSelected ? accentBg : "var(--surface-2)",
                          borderColor: isSelected ? accentBg : "var(--border)",
                          color: isSelected ? "white" : "var(--text-primary)",
                        }}
                      >
                        <OptionIcon className="w-5 h-5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{option.label}</span>
                          <p
                            className="text-xs leading-tight mt-0.5"
                            style={{
                              color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
                            }}
                          >
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Autocracy custom theme input - animated */}
                <div
                  className="grid transition-all duration-300 ease-in-out"
                  style={{
                    gridTemplateRows: themeGovernance === "autocracy" ? "1fr" : "0fr",
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="px-1 pt-5 pb-1">
                      <Input
                        label="Theme"
                        placeholder="Enter a theme name"
                        required
                        value={customTheme}
                        onChange={(e) => setCustomTheme(e.target.value)}
                        disabled={isPending || themeGovernance !== "autocracy"}
                        maxLength={50}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {currentStep === 2 && (
          <div className="space-y-5">
            {/* Festival Picture */}
            <div className="space-y-3">
              <p className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Festival Picture (Optional)
              </p>
              <div className="flex items-start gap-4">
                <div
                  className="relative w-24 h-24 rounded-lg overflow-hidden border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-2)",
                  }}
                >
                  {picturePreview ? (
                    <Image
                      src={picturePreview}
                      alt="Festival picture preview"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <FilmReel className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => pictureFileInputRef.current?.click()}
                    disabled={isPending}
                  >
                    {picturePreview ? "Change" : "Upload"}
                  </Button>
                  {picturePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPicturePreview(null);
                        if (pictureFileInputRef.current) {
                          pictureFileInputRef.current.value = "";
                        }
                      }}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  )}
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Max 15MB
                  </p>
                </div>
                <input
                  ref={pictureFileInputRef}
                  type="file"
                  name="picture"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const maxSize = 15 * 1024 * 1024;
                      if (file.size > maxSize) {
                        toast.error("Picture file size must be less than 15MB");
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPicturePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Settings Summary */}
            <table
              className="w-full text-sm rounded-lg border-separate"
              style={{ borderSpacing: 0 }}
            >
              <tbody
                className="divide-y rounded-lg overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {(
                  [
                    ["Starts", startImmediately ? "Now" : formatDateTimeForDisplay(startDateTime)],
                    ["Nominations close", formatDateTimeForDisplay(nominationDateTime)],
                    ["Ratings close", formatDateTimeForDisplay(ratingDeadline)],
                    ["Max nominations", `${maxNominationsPerUser} per member`],
                    ["Theme", getThemeDisplayText()],
                    ["Auto-advance", autoAdvance ? "On" : "Off"],
                    [
                      "Rubric",
                      clubSettings?.rubric_enforcement === "required"
                        ? "Required"
                        : clubSettings?.rubric_enforcement === "suggested"
                          ? "Suggested"
                          : "Off",
                    ],
                    ["Guessing", clubSettings?.nomination_guessing_enabled ? "On" : "Off"],
                  ] as const
                ).map(([label, value], i, arr) => (
                  <tr
                    key={label}
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <td
                      className="py-3 pl-4 pr-3 whitespace-nowrap align-top"
                      style={{
                        color: "var(--text-muted)",
                        width: "40%",
                        ...(i === 0 ? { borderTopLeftRadius: 8 } : {}),
                        ...(i === arr.length - 1 ? { borderBottomLeftRadius: 8 } : {}),
                      }}
                    >
                      {label}
                    </td>
                    <td
                      className="py-3 pr-4 pl-3 text-right font-medium align-top"
                      style={{
                        color: "var(--text-primary)",
                        ...(i === 0 ? { borderTopRightRadius: 8 } : {}),
                        ...(i === arr.length - 1 ? { borderBottomRightRadius: 8 } : {}),
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div
        className="flex items-center justify-between pt-6 mt-6 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentStep === 0 || isPending}
        >
          <CaretLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < STEP_CONFIG.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            disabled={!canGoNext() || isPending}
            style={{ backgroundColor: accentBg }}
          >
            Continue
            <CaretRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="club-accent"
            disabled={isPending || !selectedSeasonId}
            isLoading={isPending}
            onClick={handleCreateFestival}
          >
            <Sparkle className="w-4 h-4 mr-2" />
            Create Festival
          </Button>
        )}
      </div>
    </form>
  );
}
