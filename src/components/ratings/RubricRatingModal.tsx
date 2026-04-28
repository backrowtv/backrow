"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/typography";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RatingRubric } from "@/types/club-settings";
import { calculateWeightedScore, RUBRIC_SCALE } from "@/types/club-settings";
import { X, Pencil, Check, Plus, Trash, Scales } from "@phosphor-icons/react";
import { getRatingSliderGradient } from "@/lib/utils/rating-gradient";

interface RubricRatingModalProps {
  rubrics: RatingRubric[];
  onRatingChange: (rating: number, rubricRatings: Record<string, number>) => void;
  initialRatings?: Record<string, number>;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movieTitle?: string;
  rubricName?: string;
  // Personal rubrics for selection
  personalRubrics?: Array<{ id: string; name: string; rubrics: RatingRubric[] }>;
  selectedRubricId?: string | null;
  onRubricSelect?: (rubricId: string | null) => void;
  // Edit mode props - only show edit for user-created rubrics
  isUserCreatedRubric?: boolean;
  onSaveRubricEdits?: (updatedRubrics: RatingRubric[], name: string) => void;
}

export function RubricRatingModal({
  rubrics,
  onRatingChange,
  initialRatings = {},
  disabled = false,
  open,
  onOpenChange,
  movieTitle,
  rubricName = "Rating Rubric",
  personalRubrics = [],
  selectedRubricId,
  onRubricSelect: _onRubricSelect,
  isUserCreatedRubric = false,
  onSaveRubricEdits,
}: RubricRatingModalProps) {
  const scale = useMemo(() => ({ min: RUBRIC_SCALE.MIN, max: RUBRIC_SCALE.MAX }), []);

  const [activeRubrics, setActiveRubrics] = useState<RatingRubric[]>(rubrics);
  const [rubricRatings, setRubricRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    rubrics.forEach((rubric) => {
      initial[rubric.id] = initialRatings[rubric.id] ?? RUBRIC_SCALE.MIN;
    });
    return initial;
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedRubrics, setEditedRubrics] = useState<RatingRubric[]>([]);
  const [editedName, setEditedName] = useState(rubricName);

  // Update active rubrics when selected rubric changes
  useEffect(() => {
    if (selectedRubricId && personalRubrics.length > 0) {
      const selected = personalRubrics.find((pr) => pr.id === selectedRubricId);
      if (selected) {
        setActiveRubrics(selected.rubrics);
        const newRatings: Record<string, number> = {};
        selected.rubrics.forEach((rubric) => {
          newRatings[rubric.id] = RUBRIC_SCALE.MIN;
        });
        setRubricRatings(newRatings);
      }
    } else {
      setActiveRubrics(rubrics);
    }
  }, [selectedRubricId, personalRubrics, rubrics]);

  // Calculate the weighted final score
  const finalRating = useMemo(() => {
    return calculateWeightedScore(rubricRatings, activeRubrics, scale);
  }, [rubricRatings, activeRubrics, scale]);

  // Update a single category rating
  const handleCategoryRatingChange = useCallback(
    (categoryId: string, value: number) => {
      const snappedValue = Math.round(value);
      const clampedValue = Math.max(RUBRIC_SCALE.MIN, Math.min(RUBRIC_SCALE.MAX, snappedValue));

      setRubricRatings((prev) => {
        const updated = { ...prev, [categoryId]: clampedValue };
        const newFinalRating = calculateWeightedScore(updated, activeRubrics, scale);
        onRatingChange(newFinalRating, updated);
        return updated;
      });
    },
    [activeRubrics, scale, onRatingChange]
  );

  const handleClose = useCallback(() => {
    setIsEditMode(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(() => {
    // Rating is already being sent via onRatingChange
    handleClose();
  }, [handleClose]);

  // Edit mode handlers
  const handleEnterEditMode = useCallback(() => {
    setEditedRubrics([...activeRubrics]);
    setEditedName(rubricName);
    setIsEditMode(true);
  }, [activeRubrics, rubricName]);

  const handleExitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditedRubrics([]);
  }, []);

  const handleSaveEdits = useCallback(() => {
    if (onSaveRubricEdits) {
      onSaveRubricEdits(editedRubrics, editedName);
    }
    setActiveRubrics(editedRubrics);
    // Reset ratings for edited rubrics
    const newRatings: Record<string, number> = {};
    editedRubrics.forEach((rubric) => {
      newRatings[rubric.id] = rubricRatings[rubric.id] ?? RUBRIC_SCALE.MIN;
    });
    setRubricRatings(newRatings);
    setIsEditMode(false);
  }, [editedRubrics, editedName, onSaveRubricEdits, rubricRatings]);

  const handleAddCategory = useCallback(() => {
    const newRubric: RatingRubric = {
      id: `rubric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      weight: 0,
      required: false,
      order: editedRubrics.length,
    };
    setEditedRubrics((prev) => [...prev, newRubric]);
  }, [editedRubrics.length]);

  const handleRemoveCategory = useCallback((index: number) => {
    setEditedRubrics((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateCategory = useCallback((index: number, updates: Partial<RatingRubric>) => {
    setEditedRubrics((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }, []);

  // Validation for edit mode
  const editTotalWeight = useMemo(() => {
    return editedRubrics.reduce((sum, r) => sum + r.weight, 0);
  }, [editedRubrics]);

  const isEditValid = useMemo(() => {
    return Math.abs(editTotalWeight - 100) < 0.01 && editedRubrics.every((r) => r.name.trim());
  }, [editTotalWeight, editedRubrics]);

  if (activeRubrics.length === 0 && !isEditMode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <DialogTitle className="sr-only">{rubricName}</DialogTitle>
        {/* Header - Rubric Name */}
        <div
          className="px-4 py-3 border-b flex-shrink-0"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
          }}
        >
          {isEditMode ? (
            <div className="flex items-center justify-between">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-base font-medium h-8 max-w-[200px]"
                placeholder="Rubric name"
                style={{ color: "var(--primary)" }}
              />
              <button
                type="button"
                onClick={handleExitEditMode}
                className="p-1.5 rounded-full hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Text className="text-base font-medium" style={{ color: "var(--primary)" }}>
                {rubricName}
              </Text>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          )}
        </div>

        {/* Movie title subtitle */}
        {movieTitle && !isEditMode && (
          <div className="px-4 pt-2 flex-shrink-0">
            <Text size="sm" muted className="truncate">
              Rating: {movieTitle}
            </Text>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-4 flex-1 min-h-0 overflow-y-auto">
          {isEditMode ? (
            // Edit Mode - Category Editor
            <EditModeContent
              rubrics={editedRubrics}
              totalWeight={editTotalWeight}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
              onUpdateCategory={handleUpdateCategory}
            />
          ) : (
            // Rating Mode - All category sliders
            <RatingModeContent
              rubrics={activeRubrics}
              ratings={rubricRatings}
              disabled={disabled}
              onRatingChange={handleCategoryRatingChange}
            />
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t flex items-center justify-center flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          {isEditMode ? (
            // Edit mode footer
            <div className="flex items-center justify-between w-full">
              <Button type="button" variant="outline" size="sm" onClick={handleExitEditMode}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveEdits}
                disabled={!isEditValid}
              >
                <Check className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          ) : (
            // Rating mode footer - Final Rating centered with checkmark on right
            <div className="flex items-center gap-4">
              {/* Edit button - only for user-created rubrics */}
              {isUserCreatedRubric && onSaveRubricEdits && (
                <button
                  type="button"
                  onClick={handleEnterEditMode}
                  className="p-2 rounded-full hover:bg-[var(--surface-2)] transition-colors"
                  aria-label="Edit rubric"
                  title="Edit rubric categories and weights"
                >
                  <Pencil className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </button>
              )}

              {/* Final Rating Box - Centered */}
              <div
                className="flex flex-col items-center justify-center px-6 py-2 rounded-lg border-2"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                }}
              >
                <Text size="tiny" muted className="uppercase tracking-wider font-medium">
                  Final Rating
                </Text>
                <Text
                  className="text-xl font-bold tabular-nums font-mono"
                  style={{ color: "var(--text-primary)" }}
                >
                  {finalRating.toFixed(1)}
                </Text>
              </div>

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--surface-2)]"
                )}
                aria-label="Submit rating"
                title="Submit rating"
              >
                <Check
                  className="h-5 w-5"
                  style={{ color: disabled ? "var(--text-muted)" : "var(--primary)" }}
                />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Rating Mode Content - All category sliders visible at once
interface RatingModeContentProps {
  rubrics: RatingRubric[];
  ratings: Record<string, number>;
  disabled: boolean;
  onRatingChange: (categoryId: string, value: number) => void;
}

function RatingModeContent({ rubrics, ratings, disabled, onRatingChange }: RatingModeContentProps) {
  return (
    <div className="space-y-4">
      {rubrics.map((category) => (
        <CategorySliderRow
          key={category.id}
          category={category}
          value={ratings[category.id] ?? RUBRIC_SCALE.MIN}
          disabled={disabled}
          onChange={(value) => onRatingChange(category.id, value)}
        />
      ))}
    </div>
  );
}

// Category Slider Row - matches wireframe layout
// Layout: weight% (left) | category name (center above slider) | slider | score (right)
interface CategorySliderRowProps {
  category: RatingRubric;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

function CategorySliderRow({ category, value, disabled, onChange }: CategorySliderRowProps) {
  const _percentage = (value / RUBRIC_SCALE.MAX) * 100;

  return (
    <div className="space-y-1">
      {/* Category Name (centered) */}
      <Text size="sm" className="text-center font-medium" style={{ color: "var(--text-primary)" }}>
        {category.name || "Unnamed Category"}
      </Text>

      {/* Slider Row: weight% | slider | score */}
      <div className="flex items-center gap-3">
        {/* Weight Percentage - Left */}
        <span
          className="text-sm font-mono w-10 text-right flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {category.weight}%
        </span>

        {/* Slider - Center */}
        <div className="relative flex-1">
          {/* Tick marks (0-10 = 11 ticks) */}
          <div
            className="absolute inset-0 flex justify-between items-center pointer-events-none"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            {Array.from({ length: RUBRIC_SCALE.MAX + 1 }, (_, i) => {
              const isActive = i <= value;
              return (
                <div
                  key={i}
                  className="w-0.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? "var(--primary)" : "var(--surface-3)",
                    opacity: isActive ? 0.7 : 0.4,
                  }}
                />
              );
            })}
          </div>

          {/* Slider input */}
          <input
            type="range"
            min={RUBRIC_SCALE.MIN}
            max={RUBRIC_SCALE.MAX}
            step={RUBRIC_SCALE.STEP}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            disabled={disabled}
            className={cn(
              "w-full h-3 rounded-full appearance-none cursor-pointer relative z-10 touch-pan-y",
              "bg-transparent",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--background)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--primary)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--background)] [&::-moz-range-thumb]:cursor-pointer",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            style={{
              background: getRatingSliderGradient(value, RUBRIC_SCALE.MIN, RUBRIC_SCALE.MAX),
            }}
          />
        </div>

        {/* Score Value - Right */}
        <span
          className="text-sm font-mono tabular-nums w-10 text-right flex-shrink-0"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// Edit Mode Content - Inline category editor
interface EditModeContentProps {
  rubrics: RatingRubric[];
  totalWeight: number;
  onAddCategory: () => void;
  onRemoveCategory: (index: number) => void;
  onUpdateCategory: (index: number, updates: Partial<RatingRubric>) => void;
}

function EditModeContent({
  rubrics,
  totalWeight,
  onAddCategory,
  onRemoveCategory,
  onUpdateCategory,
}: EditModeContentProps) {
  const isValidWeight = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="space-y-3">
      {rubrics.length === 0 ? (
        <div
          className="p-6 rounded-lg border-2 border-dashed text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <Scales
            className="h-8 w-8 mx-auto mb-2 opacity-30"
            style={{ color: "var(--text-muted)" }}
          />
          <Text size="sm" muted>
            No categories yet
          </Text>
          <Text size="tiny" muted className="mt-1">
            Add categories to build your rubric
          </Text>
        </div>
      ) : (
        <div className="space-y-2">
          {rubrics.map((category, index) => (
            <EditCategoryRow
              key={category.id}
              category={category}
              onUpdate={(updates) => onUpdateCategory(index, updates)}
              onRemove={() => onRemoveCategory(index)}
            />
          ))}
        </div>
      )}

      {/* Add Category Button */}
      <Button type="button" variant="outline" size="sm" onClick={onAddCategory} className="w-full">
        <Plus className="h-4 w-4 mr-1" />
        Add Category
      </Button>

      {/* Weight Summary */}
      {rubrics.length > 0 && (
        <div
          className="p-3 rounded-lg"
          style={{
            backgroundColor: isValidWeight ? "var(--surface-2)" : "rgba(239, 68, 68, 0.1)",
          }}
        >
          <div className="flex items-center justify-between">
            <Text size="sm">Total Weight</Text>
            <Text
              size="sm"
              className="font-mono font-medium"
              style={{ color: isValidWeight ? "var(--text-primary)" : "var(--destructive)" }}
            >
              {totalWeight.toFixed(0)}% / 100%
              {isValidWeight && " ✓"}
            </Text>
          </div>
          {!isValidWeight && (
            <Text size="tiny" style={{ color: "var(--destructive)" }} className="mt-1">
              {totalWeight < 100
                ? `Add ${(100 - totalWeight).toFixed(0)}% more weight`
                : `Remove ${(totalWeight - 100).toFixed(0)}% weight`}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

// Edit Category Row
interface EditCategoryRowProps {
  category: RatingRubric;
  onUpdate: (updates: Partial<RatingRubric>) => void;
  onRemove: () => void;
}

function EditCategoryRow({ category, onUpdate, onRemove }: EditCategoryRowProps) {
  return (
    <div
      className="flex items-center gap-2 p-2 rounded-lg border"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
    >
      {/* Weight input */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Input
          type="number"
          min={0}
          max={100}
          value={category.weight}
          onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
          className="w-14 h-7 text-center text-xs font-mono"
        />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          %
        </span>
      </div>

      {/* Name input */}
      <Input
        value={category.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Category name"
        className="flex-1 h-7 text-sm"
      />

      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded hover:bg-[var(--destructive)]/10 transition-colors"
        aria-label="Remove category"
      >
        <Trash className="h-4 w-4" style={{ color: "var(--destructive)" }} />
      </button>
    </div>
  );
}

export default RubricRatingModal;
