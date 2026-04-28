"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import {
  FilmReel,
  CircleNotch,
  Star,
  Popcorn,
  Ticket,
  FilmStrip,
  Scales,
  X,
} from "@phosphor-icons/react";
import { calculateWeightedScore, RUBRIC_SCALE } from "@/types/club-settings";
import type { UserRatingPreferences } from "@/types/user-rating-preferences";
import { DEFAULT_RATING_PREFERENCES } from "@/types/user-rating-preferences";
import type { UserRubric } from "@/app/actions/rubrics.types";
import { getRatingSliderBackground, getRatingSliderGradient } from "@/lib/utils/rating-gradient";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { RatingCustomizeHint } from "@/components/ratings/RatingCustomizeHint";
import { SegmentedControl } from "@/components/ui/segmented-control";

type RatingMode = "generic" | "rubric";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tmdbId: number;
  movieTitle: string;
  year?: number | null;
  posterPath?: string | null;
  /** Current rating if exists (on 0-10 scale) */
  currentRating?: number | null;
  /** Called when rating is submitted (rating on 0-10 scale, optional saveAsGeneric flag) */
  onRated: (rating: number, saveAsGeneric?: boolean) => void;
  /** Called when rating is submitted with rubric */
  onRatedWithRubric?: (
    rating: number,
    rubricId: string,
    rubricRatings: Record<string, number>,
    saveAsGeneric?: boolean
  ) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** User's rating preferences */
  ratingPreferences?: UserRatingPreferences;
  /** User's rubrics for category-based rating */
  userRubrics?: UserRubric[];
  /** Whether this is a festival rating (shows "save as personal rating" checkbox) */
  isFestivalRating?: boolean;
  /** Called when user removes their rating */
  onRemoveRating?: () => void;
}

export function RatingModal({
  open,
  onOpenChange,
  tmdbId: _tmdbId,
  movieTitle,
  year,
  posterPath,
  currentRating,
  onRated,
  onRatedWithRubric,
  isSubmitting = false,
  ratingPreferences = DEFAULT_RATING_PREFERENCES,
  userRubrics = [],
  isFestivalRating = false,
  onRemoveRating,
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [saveAsGeneric, setSaveAsGeneric] = useState(true);

  const [ratingMode, setRatingMode] = useState<RatingMode>("generic");

  const { rating_increment, rating_slider_icon = "default" } = ratingPreferences;

  // Rubric mode state
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [rubricRatings, setRubricRatings] = useState<Record<string, number>>({});

  // Sort rubrics with default first
  const sortedRubrics = useMemo(() => {
    if (!userRubrics.length) return [];
    const defaultRubric = userRubrics.find((r) => r.is_default);
    const others = userRubrics.filter((r) => !r.is_default);
    return defaultRubric ? [defaultRubric, ...others] : others;
  }, [userRubrics]);

  // Get selected rubric details
  const selectedRubric = useMemo(() => {
    return sortedRubrics.find((r) => r.id === selectedRubricId);
  }, [sortedRubrics, selectedRubricId]);

  // Calculate weighted score when using rubric (rubrics always use fixed 0-10 scale)
  const rubricScale = useMemo(() => ({ min: RUBRIC_SCALE.MIN, max: RUBRIC_SCALE.MAX }), []);
  const rubricFinalRating = useMemo(() => {
    if (!selectedRubric) return 0;
    return calculateWeightedScore(rubricRatings, selectedRubric.categories, rubricScale);
  }, [rubricRatings, selectedRubric, rubricScale]);

  // Initialize rating when modal opens with current rating
  useEffect(() => {
    if (open && currentRating !== null && currentRating !== undefined) {
      setRating(currentRating);
    } else if (!open) {
      setRating(0);
      setRatingMode("generic");
      setSelectedRubricId(null);
      setRubricRatings({});
    }
  }, [open, currentRating]);

  // Auto-select default rubric when entering rubric mode
  useEffect(() => {
    if (ratingMode === "rubric" && !selectedRubricId && sortedRubrics.length > 0) {
      const defaultRubric = sortedRubrics.find((r) => r.is_default) || sortedRubrics[0];
      if (defaultRubric) {
        setSelectedRubricId(defaultRubric.id);
      }
    }
  }, [ratingMode, selectedRubricId, sortedRubrics]);

  // When rubric is selected, initialize its ratings
  useEffect(() => {
    if (selectedRubric) {
      const initialRatings: Record<string, number> = {};
      selectedRubric.categories.forEach((cat) => {
        initialRatings[cat.id] = RUBRIC_SCALE.MIN;
      });
      setRubricRatings(initialRatings);
    }
  }, [selectedRubric]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setRating(0);
        setRatingMode("generic");
        setSelectedRubricId(null);
        setRubricRatings({});
        setSaveAsGeneric(true);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  const handleSubmit = () => {
    if (isSubmitting) return;

    const shouldSaveAsGeneric = isFestivalRating ? saveAsGeneric : undefined;

    if (selectedRubric && onRatedWithRubric) {
      const hasAnyRating = Object.values(rubricRatings).some((r) => r > RUBRIC_SCALE.MIN);
      if (hasAnyRating) {
        onRatedWithRubric(rubricFinalRating, selectedRubric.id, rubricRatings, shouldSaveAsGeneric);
        return;
      }
    }

    if (rating > 0) {
      onRated(rating, shouldSaveAsGeneric);
    }
  };

  const handleRubricCategoryChange = (categoryId: string, value: number) => {
    setRubricRatings((prev) => ({ ...prev, [categoryId]: value }));
  };

  const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w185${posterPath}` : null;

  const formatRating = (value: number): string => {
    return value.toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 flex flex-col"
        contentAreaCentered
        hideClose
        style={{
          backgroundColor: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
        }}
      >
        <DialogTitle className="sr-only">Rate {movieTitle}</DialogTitle>
        {/* Movie Info Header */}
        <div className="px-5 pt-5 pb-4 relative">
          <div className="flex items-start gap-3 pr-6">
            {/* Poster */}
            <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={movieTitle}
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={getTMDBBlurDataURL()}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FilmReel className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
                </div>
              )}
            </div>

            {/* Title & Year */}
            <div className="flex-1 min-w-0 pt-1">
              <Text className="font-medium text-sm line-clamp-2 leading-snug">{movieTitle}</Text>
              {year && (
                <Text size="tiny" muted className="mt-0.5">
                  {year}
                </Text>
              )}
            </div>
          </div>
          {/* Close button */}
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" weight="bold" />
          </button>
        </div>

        {/* Mode Toggle - Only show if user has rubrics */}
        {sortedRubrics.length > 0 && (
          <div className="px-5 pb-2">
            <SegmentedControl
              variant="glass"
              size="sm"
              value={ratingMode}
              onChange={(v) => setRatingMode(v as RatingMode)}
              options={[
                {
                  value: "generic",
                  label: "Quick Rate",
                  icon: (
                    <Star
                      weight={ratingMode === "generic" ? "fill" : "regular"}
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

        {/* Rating Area */}
        <div className="px-5 pb-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {ratingMode === "generic" ? (
            /* Numeric Rating with Slider */
            <div className="flex flex-col items-center gap-3">
              {/* Rating Value Display */}
              <div className="text-center">
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{
                    color: rating > 0 ? "var(--primary)" : "var(--text-muted)",
                  }}
                >
                  {rating > 0 ? formatRating(rating) : "—"}
                </span>
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>
                  / 10
                </span>
              </div>

              {/* Slider */}
              <div className="w-full px-2 touch-none">
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={rating_increment}
                    value={rating || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      const snapped = Math.round(value / rating_increment) * rating_increment;
                      setRating(Math.max(0, Math.min(10, snapped)));
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full h-3 rounded-full appearance-none cursor-pointer relative z-10",
                      rating_slider_icon === "default"
                        ? "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--background)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                        : "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:cursor-pointer",
                      rating_slider_icon === "default"
                        ? "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--primary)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--background)] [&::-moz-range-thumb]:cursor-pointer"
                        : "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-none [&::-moz-range-thumb]:cursor-pointer",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    style={{
                      background: getRatingSliderBackground(rating, 0, 10),
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
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    0
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    10
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Rubric Rating Mode */
            <div className="space-y-3">
              {/* Rubric Selector Dropdown */}
              <div>
                <label
                  htmlFor="rating-modal-rubric-select"
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Select Rubric
                </label>
                <select
                  id="rating-modal-rubric-select"
                  value={selectedRubricId || ""}
                  onChange={(e) => setSelectedRubricId(e.target.value || null)}
                  className="w-full h-9 px-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {sortedRubrics.map((rubric) => (
                    <option key={rubric.id} value={rubric.id}>
                      {rubric.name} {rubric.is_default ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

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
            </div>
          )}

          {/* Save as personal rating checkbox (only for festival ratings) */}
          {isFestivalRating && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsGeneric}
                onChange={(e) => setSaveAsGeneric(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
              />
              <span style={{ color: "var(--text-secondary)" }}>
                Also save as my personal rating
              </span>
            </label>
          )}

          {/* Submit Button */}
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleSubmit}
            disabled={
              (ratingMode === "rubric"
                ? !selectedRubric || !Object.values(rubricRatings).some((r) => r > RUBRIC_SCALE.MIN)
                : rating <= 0) || isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : ratingMode === "rubric" && selectedRubric ? (
              `Submit (${rubricFinalRating.toFixed(1)})`
            ) : currentRating ? (
              "Update Rating"
            ) : (
              "Submit Rating"
            )}
          </Button>

          {/* Customization hint */}
          <RatingCustomizeHint />

          {/* Remove Rating - only show when editing an existing rating */}
          {currentRating != null && onRemoveRating && (
            <button
              type="button"
              onClick={onRemoveRating}
              disabled={isSubmitting}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
            >
              Remove rating
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RatingModal;
