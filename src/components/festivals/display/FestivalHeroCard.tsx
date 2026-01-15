"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { selectFestivalTheme, selectCustomTheme, selectRandomTheme } from "@/app/actions/themes";
import type { FestivalPhase } from "@/types/festival";
import type { FestivalType, ThemeGovernance } from "@/types/club-settings";
import toast from "react-hot-toast";
import { FilmReel, Play, CaretDown, CaretUp, Sparkle, Shuffle, Check } from "@phosphor-icons/react";
import { FlipCountdown } from "@/components/ui/flip-countdown";

const PHASE_ACTIONS: Record<FestivalPhase, { action: string; actionLabel: string }> = {
  theme_selection: { action: "select", actionLabel: "Select Theme" },
  nomination: { action: "nominate", actionLabel: "Nominate Movie" },
  watch_rate: { action: "rate", actionLabel: "Rate Movies" },
  results: { action: "results", actionLabel: "View Results" },
};

// Get phase label based on phase and ratings setting
function _getPhaseConfigLabel(phase: FestivalPhase, ratingsEnabled: boolean): string {
  switch (phase) {
    case "theme_selection":
      return "Theme Selection";
    case "nomination":
      return "Nominations Open";
    case "watch_rate":
      return ratingsEnabled ? "Watch & Rate" : "Watch";
    case "results":
      return "Results";
  }
}

interface Festival {
  id: string;
  slug: string | null;
  theme: string | null;
  phase: string;
  status: string;
  start_date: string;
  nomination_deadline: string | null;
  watch_deadline: string | null;
  rating_deadline: string | null;
  results_date: string | null;
  member_count_at_creation: number;
  picture_url?: string | null;
  background_type?: string | null;
  background_value?: string | null;
  keywords?: string[] | null;
}

interface TopTheme {
  id: string;
  theme_name: string;
  votes: number;
}

interface FestivalHeroCardProps {
  festival: Festival;
  clubSlug: string;
  clubName: string;
  clubId?: string;
  festivalType?: FestivalType;
  themeGovernance?: ThemeGovernance;
  topThemes?: TopTheme[];
  nominationCount?: number;
  ratingCount?: number;
  participantCount?: number;
  userHasNominated?: boolean;
  userHasRated?: boolean;
  isAdmin?: boolean;
  topNominations?: Array<{
    id: string;
    tmdb_id: number;
    movie_title: string;
    poster_url: string | null;
    nominator_name: string;
    nominator_avatar?: string | null;
  }>;
  onPhaseChange?: () => void;
  onEditClick?: () => void;
  // Breadcrumb visibility props
  themesEnabled?: boolean;
  scoringEnabled?: boolean;
  guessingEnabled?: boolean;
  // Hide "View Details" when already on festival page
  isOnFestivalPage?: boolean;
  // Callback for nomination button when on festival page
  onNominateClick?: () => void;
  // Whether the festival auto-advances on deadline (hides manual advance button)
  autoAdvance?: boolean;
}

export function FestivalHeroCard({
  festival,
  clubSlug,
  clubName: _clubName,
  clubId: _clubId,
  festivalType = "standard",
  themeGovernance = "democracy",
  topThemes = [],
  nominationCount = 0,
  ratingCount: _ratingCount = 0,
  participantCount = 0,
  userHasNominated = false,
  userHasRated = false,
  isAdmin = false,
  topNominations = [],
  onPhaseChange: _onPhaseChange,
  onEditClick: _onEditClick,
  // Breadcrumb visibility props
  themesEnabled = true,
  scoringEnabled = true,
  guessingEnabled = false,
  // Hide "View Details" when already on festival page
  isOnFestivalPage = false,
  // Callback for nomination button when on festival page
  onNominateClick,
  // Whether the festival auto-advances on deadline
  autoAdvance: _autoAdvance = false,
}: FestivalHeroCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isThemeSelectionOpen, setIsThemeSelectionOpen] = useState(false);
  const [customTheme, setCustomTheme] = useState("");

  const phase = festival.phase as FestivalPhase;
  const phaseAction = PHASE_ACTIONS[phase];

  // Get the relevant deadline for current phase
  const getDeadline = () => {
    if (phase === "theme_selection") {
      return festival.nomination_deadline;
    }
    if (phase === "nomination") {
      return festival.nomination_deadline;
    }
    if (phase === "watch_rate") {
      return festival.rating_deadline;
    }
    return null;
  };

  const deadline = getDeadline();
  const festivalUrl = `/club/${clubSlug}/festival/${festival.slug || festival.id}`;

  // Determine user status
  const getUserStatus = () => {
    if (phase === "results") return { label: "Complete", type: "success" as const };
    if (phase === "watch_rate" && userHasRated) return { label: "Rated", type: "success" as const };
    if ((phase === "nomination" || phase === "watch_rate") && userHasNominated)
      return { label: "Nominated", type: "primary" as const };
    return { label: "Join In", type: "default" as const };
  };

  const _userStatus = getUserStatus();

  // Handle theme selection actions
  const handleSelectTheme = async (themeId: string) => {
    startTransition(async () => {
      const result = await selectFestivalTheme(festival.id, themeId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Theme selected! Advancing to nominations...");
        router.refresh();
      }
    });
  };

  const handleCustomTheme = async () => {
    if (!customTheme.trim()) {
      toast.error("Please enter a theme name");
      return;
    }
    startTransition(async () => {
      const result = await selectCustomTheme(festival.id, customTheme);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Theme "${result.theme}" selected! Advancing to nominations...`);
        setCustomTheme("");
        setIsThemeSelectionOpen(false);
        router.refresh();
      }
    });
  };

  const handleRandomTheme = async () => {
    startTransition(async () => {
      const result = await selectRandomTheme(festival.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Random theme "${result.theme}" selected! Advancing to nominations...`);
        setIsThemeSelectionOpen(false);
        router.refresh();
      }
    });
  };

  // Button text based on governance
  const getThemeButtonText = () => {
    if (themeGovernance === "random") return "Random Theme";
    return "Select Theme";
  };

  // Button icon based on governance
  const getThemeButtonIcon = () => {
    if (themeGovernance === "random") return Shuffle;
    return Play;
  };
  const ThemeButtonIcon = getThemeButtonIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* Background Image (subtle) */}
      {festival.picture_url && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image
            src={festival.picture_url}
            alt=""
            fill
            className="object-cover opacity-5"
            sizes="100vw"
          />
        </div>
      )}

      <div className="relative z-10 text-center">
        {/* Festival Title - TOPMOST element */}
        <h2
          className="text-xl md:text-2xl font-bold mb-2 line-clamp-2"
          style={{ color: "var(--club-accent, var(--text-primary))" }}
        >
          {phase === "theme_selection" ? "Theme Selection" : festival.theme || "Festival"}
        </h2>

        {/* Phase Progress Breadcrumbs */}
        {(() => {
          // Determine which breadcrumbs to show
          const showTheme = themesEnabled;
          const showResults = scoringEnabled || guessingEnabled || festivalType !== "endless";

          // Build the phases array based on settings
          type BreadcrumbPhase = {
            id: FestivalPhase;
            label: string;
          };
          const phases: BreadcrumbPhase[] = [];

          if (showTheme) {
            phases.push({
              id: "theme_selection",
              label: "Theme",
            });
          }
          phases.push({
            id: "nomination",
            label: "Nominate",
          });
          phases.push({
            id: "watch_rate",
            label: "Watch",
          });
          if (showResults) {
            phases.push({
              id: "results",
              label: "Results",
            });
          }

          // Find current phase index
          const currentIndex = phases.findIndex((p) => p.id === phase);

          return (
            <div className="flex items-center justify-center gap-3 text-xs mb-4">
              {/* Breadcrumb items */}
              <div className="flex items-center">
                {phases.map((p, index) => {
                  const isCurrent = p.id === phase;
                  const isPast = index < currentIndex;
                  const isFirst = index === 0;

                  return (
                    <div key={p.id} className="flex items-center">
                      {!isFirst && (
                        <span
                          className="mx-1.5 text-[10px]"
                          style={{ color: "var(--text-muted)", opacity: 0.4 }}
                        >
                          •
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded transition-all ${
                          isCurrent ? "font-medium" : isPast ? "opacity-60" : "opacity-40"
                        }`}
                        style={{
                          color: isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                          backgroundColor: isCurrent ? "var(--surface-2)" : "transparent",
                        }}
                      >
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Flip Countdown Timer - below breadcrumbs */}
        {deadline && phase !== "results" && (
          <div className="mb-4 flex items-center justify-center relative">
            <FlipCountdown
              deadline={deadline}
              label={
                phase === "theme_selection"
                  ? "Nominations Open In"
                  : phase === "nomination"
                    ? "Nominations Close"
                    : "Ratings Close"
              }
              showDays={true}
              showSeconds={true}
              size="compact"
            />
          </div>
        )}

        {/* Nomination Phase - Movies Carousel */}
        {phase === "nomination" && (
          <div className="mb-5">
            <div className="carousel-trough">
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide overscroll-x-contain px-3 md:px-4 py-2.5 md:py-3">
                {/* Show actual nominations if any */}
                {topNominations.slice(0, 5).map((nom, i) => (
                  <motion.div
                    key={nom.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0"
                  >
                    <Link href={`/movies/${nom.tmdb_id}`} className="block">
                      <div className="relative w-[70px] md:w-24 aspect-[2/3] overflow-hidden rounded-md bg-[var(--surface-1)] poster-card-embossed hover:scale-105 transition-transform">
                        {nom.poster_url ? (
                          <Image
                            src={nom.poster_url}
                            alt={nom.movie_title}
                            fill
                            className="object-cover"
                            sizes="(min-width: 768px) 96px, 70px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FilmReel className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                      </div>
                      <p
                        className="hidden md:block mt-1.5 text-xs text-center truncate max-w-24"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {nom.movie_title}
                      </p>
                    </Link>
                  </motion.div>
                ))}
                {/* Show empty placeholder slots for remaining */}
                {Array.from({
                  length: Math.max(
                    0,
                    Math.min(5 - topNominations.length, (participantCount || 5) - nominationCount)
                  ),
                }).map((_, i) => (
                  <motion.div
                    key={`placeholder-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (topNominations.length + i) * 0.05 }}
                    className="flex-shrink-0"
                  >
                    <div
                      className="relative w-[70px] md:w-24 aspect-[2/3] rounded-md border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
                    >
                      <FilmReel
                        className="w-4 h-4 md:w-5 md:h-5"
                        style={{ color: "var(--text-muted)", opacity: 0.5 }}
                      />
                    </div>
                    {/* Spacer for title on desktop */}
                    <div className="hidden md:block h-5 mt-1.5" />
                  </motion.div>
                ))}
                {/* Show +N if more than 5 nominations */}
                {nominationCount > 5 && (
                  <div className="flex-shrink-0">
                    <div
                      className="w-[70px] md:w-24 aspect-[2/3] rounded-md flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: "var(--surface-2)", color: "var(--text-primary)" }}
                    >
                      +{nominationCount - 5}
                    </div>
                    {/* Spacer for title on desktop */}
                    <div className="hidden md:block h-5 mt-1.5" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Keywords */}
        {festival.keywords && festival.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {festival.keywords.slice(0, 5).map((keyword, index) => (
              <Badge key={index} variant="secondary" size="sm">
                {keyword}
              </Badge>
            ))}
            {festival.keywords.length > 5 && (
              <Badge variant="secondary" size="sm">
                +{festival.keywords.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* Theme Selection Inline Panel */}
        {phase === "theme_selection" && isAdmin && (
          <AnimatePresence>
            {isThemeSelectionOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-4"
              >
                <div className="pt-4 space-y-4">
                  {/* Top voted themes - show for democracy and autocracy */}
                  {themeGovernance !== "random" && topThemes.length > 0 && (
                    <div className="space-y-2">
                      <p
                        className="text-xs opacity-50 text-center"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Top voted themes
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {topThemes.map((theme) => (
                          <Button
                            key={theme.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectTheme(theme.id)}
                            disabled={isPending}
                            className="h-8 text-xs"
                          >
                            {theme.theme_name}
                            {theme.votes > 0 && (
                              <span className="ml-1.5 opacity-50">({theme.votes})</span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom theme input - show for autocracy */}
                  {themeGovernance === "autocracy" && (
                    <div className="flex gap-2 justify-center max-w-sm mx-auto">
                      <Input
                        placeholder="Enter custom theme..."
                        value={customTheme}
                        onChange={(e) => setCustomTheme(e.target.value)}
                        className="h-9 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCustomTheme();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCustomTheme}
                        disabled={isPending || !customTheme.trim()}
                        className="h-9"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Random theme - automatic selection */}
                  {themeGovernance === "random" && (
                    <div className="text-center">
                      <p className="text-xs opacity-50 mb-3" style={{ color: "var(--text-muted)" }}>
                        A theme will be randomly selected from the pool
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRandomTheme}
                        disabled={isPending}
                        className="h-9"
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        {isPending ? "Selecting..." : "Pick Random Theme"}
                      </Button>
                    </div>
                  )}

                  {/* Democracy - just select from top themes */}
                  {themeGovernance === "democracy" && topThemes.length === 0 && (
                    <p
                      className="text-xs opacity-50 text-center"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No themes in the pool yet
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Actions - only show if there's something to display */}
        {(phase !== "watch_rate" || !isOnFestivalPage) && (
          <div className="flex flex-row gap-2 justify-center">
            {/* Theme Selection Button - inline expansion for admins */}
            {phase === "theme_selection" && isAdmin ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsThemeSelectionOpen(!isThemeSelectionOpen);
                }}
                disabled={isPending}
              >
                <ThemeButtonIcon className="w-3.5 h-3.5 mr-1.5" />
                {getThemeButtonText()}
                {isThemeSelectionOpen ? (
                  <CaretUp className="w-3.5 h-3.5 ml-1" />
                ) : (
                  <CaretDown className="w-3.5 h-3.5 ml-1" />
                )}
              </Button>
            ) : phase === "nomination" && onNominateClick && !userHasNominated ? (
              <Button size="sm" variant="club-accent" onClick={onNominateClick}>
                {phaseAction.actionLabel}
              </Button>
            ) : phase === "results" && !isOnFestivalPage ? (
              <Button size="sm" variant="club-accent" asChild>
                <Link href={festivalUrl}>{phaseAction.actionLabel}</Link>
              </Button>
            ) : null}
            {!isOnFestivalPage && (
              <Button variant="outline" size="sm" asChild>
                <Link href={festivalUrl}>View Details</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Empty state when no active festival
export function NoActiveFestivalCard({
  clubSlug: _clubSlug,
  isAdmin,
  onCreateFestival,
}: {
  clubSlug: string;
  isAdmin: boolean;
  onCreateFestival?: () => void;
}) {
  return (
    <Card
      className="border-dashed border-2"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
    >
      <CardContent className="p-4 text-center">
        <motion.div
          className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--surface-2)" }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <FilmReel className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
        </motion.div>

        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          No Active Festival
        </h3>
        <p className="mb-3 max-w-sm mx-auto text-sm" style={{ color: "var(--text-muted)" }}>
          {isAdmin
            ? "Start a new festival to get your club watching movies together!"
            : "Check back soon for the next festival!"}
        </p>

        {isAdmin && onCreateFestival && (
          <Button onClick={onCreateFestival} variant="club-accent">
            <Sparkle className="w-4 h-4 mr-2" />
            Start New Festival
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
