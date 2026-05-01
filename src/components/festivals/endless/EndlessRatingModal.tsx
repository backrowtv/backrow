"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { getUserRubrics } from "@/app/actions/rubrics";
import { X, Star, FilmReel, Popcorn, Ticket, FilmStrip, Scales } from "@phosphor-icons/react";
import { RatingCustomizeHint } from "@/components/ratings/RatingCustomizeHint";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { calculateWeightedScore, RUBRIC_SCALE } from "@/types/club-settings";
import { getRatingSliderGradient } from "@/lib/utils/rating-gradient";
import type { ClubRatingSettings } from "./EndlessFestivalSection";
import type { UserRubric } from "@/app/actions/rubrics.types";

type RatingMode = "quick" | "rubric";

const CLUB_RUBRIC_ID = "__club__";

type RubricOption = Pick<UserRubric, "id" | "name" | "categories" | "is_default">;

// Movie type for rating modal (subset of EndlessMovie with optional enhanced fields)
interface RatingMovie {
  id: string;
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_url: string | null;
  director: string | null;
}

interface EndlessRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movie: RatingMovie | null;
  ratingSettings: ClubRatingSettings;
  onSubmit: (rating: number) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  initialRating?: number;
}

export function EndlessRatingModal({
  open,
  onOpenChange,
  movie,
  ratingSettings,
  onSubmit,
  onDelete,
  isSubmitting,
  initialRating,
}: EndlessRatingModalProps) {
  const {
    rating_increment,
    rating_slider_icon = "default",
    rating_rubrics,
    rubric_enforcement = "off",
  } = ratingSettings;

  const isRequired = rubric_enforcement === "required" && rating_rubrics.length > 0;

  const [rating, setRating] = useState(initialRating ?? 0);
  const [rubricRatings, setRubricRatings] = useState<Record<string, number>>({});

  // Personal rubric state
  const [personalRubrics, setPersonalRubrics] = useState<UserRubric[]>([]);
  const [personalRubricsLoaded, setPersonalRubricsLoaded] = useState(false);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [ratingMode, setRatingMode] = useState<RatingMode>(isRequired ? "rubric" : "quick");

  // Synthetic club rubric entry
  const clubRubricEntry = useMemo((): RubricOption | null => {
    if (rating_rubrics.length === 0 || rubric_enforcement === "off") return null;
    return {
      id: CLUB_RUBRIC_ID,
      name: ratingSettings.rating_rubric_name || "Club Rubric",
      categories: rating_rubrics,
      is_default: false,
    };
  }, [rating_rubrics, rubric_enforcement, ratingSettings.rating_rubric_name]);

  // Merged list: club rubric (if any) + personal rubrics (unless enforcement is "required")
  const allAvailableRubrics = useMemo((): RubricOption[] => {
    const list: RubricOption[] = [];
    if (clubRubricEntry) {
      list.push(clubRubricEntry);
    }
    if (!isRequired) {
      list.push(...personalRubrics);
    }
    return list;
  }, [clubRubricEntry, personalRubrics, isRequired]);

  // Selected rubric (searches combined list)
  const selectedRubric = useMemo(() => {
    return allAvailableRubrics.find((r) => r.id === selectedRubricId) ?? null;
  }, [allAvailableRubrics, selectedRubricId]);

  // Prefetch personal rubrics on mount (not on open) so the rubric tab
  // is ready instantly when the user opens the modal — getUserRubrics()
  // is a server-action round trip that was making the rubric tab feel
  // laggy when fired on first open.
  useEffect(() => {
    if (personalRubricsLoaded) return;
    getUserRubrics()
      .then((result) => {
        if (result.data) {
          setPersonalRubrics(result.data);
        }
      })
      .catch(() => {})
      .finally(() => setPersonalRubricsLoaded(true));
  }, [personalRubricsLoaded]);

  // Auto-select rubric after loading
  useEffect(() => {
    if (!personalRubricsLoaded || !open) return;
    // Don't re-select if already set and valid
    if (selectedRubricId && allAvailableRubrics.some((r) => r.id === selectedRubricId)) return;

    if (isRequired && clubRubricEntry) {
      setSelectedRubricId(CLUB_RUBRIC_ID);
      setRatingMode("rubric");
    } else if (rubric_enforcement === "suggested" && clubRubricEntry) {
      const defaultPersonal = personalRubrics.find((r) => r.is_default);
      setSelectedRubricId(defaultPersonal?.id ?? CLUB_RUBRIC_ID);
    } else {
      const defaultRubric = personalRubrics.find((r) => r.is_default);
      setSelectedRubricId(defaultRubric?.id ?? personalRubrics[0]?.id ?? null);
    }
  }, [
    open,
    personalRubricsLoaded,
    allAvailableRubrics,
    rubric_enforcement,
    isRequired,
    clubRubricEntry,
    personalRubrics,
    selectedRubricId,
  ]);

  // Reset rubric ratings when switching rubrics
  useEffect(() => {
    setRubricRatings({});
  }, [selectedRubricId]);

  // Sync rating state when modal opens or initialRating changes
  useEffect(() => {
    if (open) {
      setRating(initialRating ?? 0);
    }
  }, [open, initialRating]);

  // Reset state when modal closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setRating(0);
        setRubricRatings({});
        setRatingMode(isRequired ? "rubric" : "quick");
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, isRequired]
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const snapped = Math.round(value / rating_increment) * rating_increment;
    setRating(Math.max(0, Math.min(10, snapped)));
  };

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating);
    }
  };

  // Handle individual rubric category slider change (for inline rubric UI)
  const handleRubricCategoryChange = useCallback(
    (categoryId: string, value: number) => {
      const newRubricRatings = { ...rubricRatings, [categoryId]: value };
      setRubricRatings(newRubricRatings);
      // Recalculate weighted score
      if (selectedRubric) {
        const score = calculateWeightedScore(newRubricRatings, selectedRubric.categories, {
          min: RUBRIC_SCALE.MIN,
          max: RUBRIC_SCALE.MAX,
        });
        setRating(score);
      }
    },
    [rubricRatings, selectedRubric]
  );

  // Computed rubric final score for inline display
  const rubricFinalRating = useMemo(() => {
    if (!selectedRubric) return 0;
    return calculateWeightedScore(rubricRatings, selectedRubric.categories, {
      min: RUBRIC_SCALE.MIN,
      max: RUBRIC_SCALE.MAX,
    });
  }, [selectedRubric, rubricRatings]);

  if (!movie) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 flex flex-col"
        hideClose
        contentAreaCentered
        style={{
          backgroundColor: "var(--surface-1)",
          border: "2px solid var(--border)",
          borderRadius: "12px",
        }}
      >
        <DialogTitle className="sr-only">Rate Movie</DialogTitle>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Text className="text-base font-medium">Rate Movie</Text>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="p-1.5 rounded-full hover:bg-[var(--surface-2)] transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Mode Toggle - Show when rubrics are available */}
        {!isRequired && allAvailableRubrics.length > 0 && (
          <div className="px-4 pt-3">
            <SegmentedControl
              variant="glass"
              size="sm"
              value={ratingMode}
              onChange={(v) => setRatingMode(v as RatingMode)}
              options={[
                {
                  value: "quick",
                  label: "Quick Rate",
                  icon: (
                    <Star
                      weight={ratingMode === "quick" ? "fill" : "regular"}
                      className="h-3.5 w-3.5"
                    />
                  ),
                },
                {
                  value: "rubric",
                  label: "Rubric",
                  icon: (
                    <Scales
                      weight={ratingMode === "rubric" ? "fill" : "regular"}
                      className="h-3.5 w-3.5"
                    />
                  ),
                },
              ]}
              className="w-full"
            />
          </div>
        )}

        {/* Movie Info */}
        <div className="px-4 py-4 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
              {movie.poster_url ? (
                <Image
                  src={movie.poster_url}
                  alt={movie.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FilmReel className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Text className="font-semibold truncate">{movie.title}</Text>
              <Text size="sm" muted>
                {movie.year}
              </Text>
              {movie.director && (
                <Text size="sm" muted>
                  Dir. {movie.director}
                </Text>
              )}
            </div>
          </div>

          {/* Rating Input */}
          <div className="space-y-4">
            {ratingMode === "quick" ? (
              // Number rating with slider
              <div className="space-y-3">
                <div className="text-center">
                  <Text
                    className="text-3xl font-bold tabular-nums font-mono"
                    style={{ color: rating > 0 ? "var(--primary)" : "var(--text-muted)" }}
                  >
                    {rating > 0 ? formatRatingDisplay(rating) : "\u2014"}
                  </Text>
                  <Text size="sm" muted>
                    / 10
                  </Text>
                </div>

                {/* Slider */}
                <div className="px-2 touch-none">
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={rating_increment}
                      value={rating || 0}
                      onChange={handleSliderChange}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full h-3 rounded-full appearance-none cursor-pointer relative z-10 touch-pan-y",
                        rating_slider_icon === "default"
                          ? "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--background)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                          : "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:cursor-pointer",
                        rating_slider_icon === "default"
                          ? "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--primary)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--background)] [&::-moz-range-thumb]:cursor-pointer"
                          : "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-none [&::-moz-range-thumb]:cursor-pointer",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                      style={{
                        background:
                          rating > 0
                            ? `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(rating / 10) * 100}%, var(--surface-2) ${(rating / 10) * 100}%, var(--surface-2) 100%)`
                            : "var(--surface-2)",
                      }}
                    />
                    {/* Custom icon thumb overlay */}
                    {rating_slider_icon !== "default" &&
                      (() => {
                        const percent = (rating || 0) / 10;
                        const thumbRadius = 12;
                        return (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)] shadow-md z-20"
                            style={{
                              left: `calc(${percent * 100}% + ${thumbRadius - percent * thumbRadius * 2}px - ${thumbRadius}px)`,
                              color: "white",
                            }}
                          >
                            {rating_slider_icon === "stars" && (
                              <Star weight="fill" className="w-3.5 h-3.5" />
                            )}
                            {rating_slider_icon === "popcorn" && (
                              <Popcorn weight="fill" className="w-3.5 h-3.5" />
                            )}
                            {rating_slider_icon === "ticket" && (
                              <Ticket weight="fill" className="w-3.5 h-3.5" />
                            )}
                            {rating_slider_icon === "film" && (
                              <FilmStrip weight="fill" className="w-3.5 h-3.5" />
                            )}
                          </div>
                        );
                      })()}
                  </div>
                  <div className="flex justify-between mt-1">
                    <Text size="tiny" muted>
                      0
                    </Text>
                    <Text size="tiny" muted>
                      10
                    </Text>
                  </div>
                </div>
              </div>
            ) : (
              /* Rubric Rating Mode */
              <div className="space-y-3">
                {/* Required: show rubric name as label */}
                {isRequired && selectedRubric && (
                  <Text size="sm" className="font-medium" style={{ color: "var(--primary)" }}>
                    {selectedRubric.name}
                  </Text>
                )}

                {/* Rubric Selector Dropdown - show when 2+ options and not required */}
                {allAvailableRubrics.length > 1 && !isRequired && (
                  <div>
                    <label
                      htmlFor="endless-rubric-select"
                      className="text-xs font-medium mb-1.5 block"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Select Rubric
                    </label>
                    <select
                      id="endless-rubric-select"
                      value={selectedRubricId || ""}
                      onChange={(e) => setSelectedRubricId(e.target.value || null)}
                      className="w-full h-9 px-3 rounded-lg border text-sm"
                      style={{
                        backgroundColor: "var(--surface-2)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {allAvailableRubrics.map((rubric) => (
                        <option key={rubric.id} value={rubric.id}>
                          {rubric.name}
                          {rubric.id === CLUB_RUBRIC_ID ? " (Club)" : ""}
                          {rubric.is_default ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rubric Category Sliders */}
                {selectedRubric && (
                  <div className="space-y-3">
                    {selectedRubric.categories.map((category) => (
                      <div key={category.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {category.name}
                          </span>
                          <span
                            className="text-xs tabular-nums"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {category.weight}% · {rubricRatings[category.id] ?? RUBRIC_SCALE.MIN}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={RUBRIC_SCALE.MIN}
                          max={RUBRIC_SCALE.MAX}
                          step={RUBRIC_SCALE.STEP}
                          value={rubricRatings[category.id] ?? RUBRIC_SCALE.MIN}
                          onChange={(e) =>
                            handleRubricCategoryChange(category.id, parseFloat(e.target.value))
                          }
                          disabled={isSubmitting}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer touch-pan-y [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:cursor-pointer"
                          style={{
                            background: getRatingSliderGradient(
                              rubricRatings[category.id] ?? RUBRIC_SCALE.MIN,
                              RUBRIC_SCALE.MIN,
                              RUBRIC_SCALE.MAX,
                              "var(--primary)",
                              "var(--surface-3)"
                            ),
                          }}
                        />
                      </div>
                    ))}

                    {/* Weighted Final Score */}
                    <div
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                        Weighted Score
                      </span>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: "var(--primary)" }}
                      >
                        {rubricFinalRating.toFixed(1)} / {RUBRIC_SCALE.MAX}
                      </span>
                    </div>
                  </div>
                )}

                {/* Empty state - no rubrics available */}
                {!selectedRubric && !isRequired && (
                  <div className="text-center py-6 space-y-3">
                    <Scales className="w-8 h-8 mx-auto" style={{ color: "var(--text-muted)" }} />
                    <div>
                      <Text size="sm" className="font-medium mb-1">
                        No rubrics yet
                      </Text>
                      <Text size="tiny" muted>
                        Rate movies across categories like story, acting, and cinematography with
                        weighted scores.
                      </Text>
                    </div>
                    <Link
                      href="/profile/settings/ratings"
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        color: "var(--primary)",
                        backgroundColor: "var(--surface-2)",
                      }}
                      onClick={() => handleOpenChange(false)}
                    >
                      Create a Rubric
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 space-y-2">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleSubmit}
            disabled={
              (ratingMode === "rubric"
                ? !selectedRubric || !Object.values(rubricRatings).some((r) => r > RUBRIC_SCALE.MIN)
                : rating === 0) || isSubmitting
            }
            isLoading={isSubmitting}
          >
            {initialRating !== undefined ? "Update Rating" : "Submit Rating"}
          </Button>

          <RatingCustomizeHint />

          {initialRating !== undefined && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
            >
              Remove rating
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
