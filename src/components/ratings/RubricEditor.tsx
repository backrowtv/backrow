"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { RatingRubric } from "@/types/club-settings";
import { createDefaultRubric } from "@/types/club-settings";
import { DotsSixVertical, Trash, Plus, Minus, Lock, LockOpen } from "@phosphor-icons/react";

interface RubricEditorProps {
  rubrics: RatingRubric[];
  rubricName?: string;
  onChange: (rubrics: RatingRubric[]) => void;
  onNameChange?: (name: string) => void;
  disabled?: boolean;
  maxCategories?: number;
}

export function RubricEditor({
  rubrics,
  rubricName,
  onChange,
  onNameChange,
  disabled = false,
  maxCategories = 10,
}: RubricEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const totalWeight = rubrics.reduce((sum, r) => sum + r.weight, 0);
  const isValidWeight = rubrics.length === 0 || Math.abs(totalWeight - 100) < 0.01;

  const handleAddCategory = useCallback(() => {
    if (rubrics.length >= maxCategories) return;
    const newCategory = createDefaultRubric(rubrics.length, rubrics);
    onChange([...rubrics, newCategory]);
  }, [rubrics, onChange, maxCategories]);

  const handleRemoveCategory = useCallback(
    (index: number) => {
      const updated = rubrics.filter((_, i) => i !== index);
      // Update order values
      const reordered = updated.map((r, i) => ({ ...r, order: i }));
      onChange(reordered);
    },
    [rubrics, onChange]
  );

  const handleUpdateCategory = useCallback(
    (index: number, updates: Partial<RatingRubric>) => {
      const updated = rubrics.map((r, i) => (i === index ? { ...r, ...updates } : r));
      onChange(updated);
    },
    [rubrics, onChange]
  );

  const handleMoveCategory = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= rubrics.length) return;

      const updated = [...rubrics];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      // Update order values
      const reordered = updated.map((r, i) => ({ ...r, order: i }));
      onChange(reordered);
    },
    [rubrics, onChange]
  );

  const handleAutoBalance = useCallback(() => {
    if (rubrics.length === 0) return;
    const lockedWeight = rubrics.filter((r) => r.locked).reduce((sum, r) => sum + r.weight, 0);
    const unlocked = rubrics.filter((r) => !r.locked);
    if (unlocked.length === 0) return;
    const remaining = Math.max(0, 100 - lockedWeight);
    const equalWeight = Math.floor(remaining / unlocked.length);
    const remainder = remaining - equalWeight * unlocked.length;

    let unlockedIdx = 0;
    const updated = rubrics.map((r) => {
      if (r.locked) return r;
      const weight = equalWeight + (unlockedIdx < remainder ? 1 : 0);
      unlockedIdx++;
      return { ...r, weight };
    });
    onChange(updated);
  }, [rubrics, onChange]);

  const handleWeightChange = useCallback(
    (index: number, newWeight: number) => {
      // Clamp weight between 0 and 100
      const clampedWeight = Math.max(0, Math.min(100, newWeight));
      handleUpdateCategory(index, { weight: clampedWeight });
    },
    [handleUpdateCategory]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;
      handleMoveCategory(draggedIndex, index);
      setDraggedIndex(index);
    },
    [draggedIndex, handleMoveCategory]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header Row: Name + Weight Status */}
      <div className="flex items-center justify-between gap-4">
        {onNameChange ? (
          <Input
            value={rubricName || ""}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Rubric Name"
            className="text-sm font-medium h-9 flex-1 max-w-[240px]"
            disabled={disabled}
          />
        ) : rubricName ? (
          <Text className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {rubricName}
          </Text>
        ) : null}

        {/* Weight Status + Auto-balance inline */}
        {rubrics.length > 0 && (
          <div className="flex items-center gap-3">
            <Text
              size="sm"
              className="font-mono tabular-nums whitespace-nowrap"
              style={{ color: isValidWeight ? "var(--text-muted)" : "var(--destructive)" }}
            >
              {totalWeight.toFixed(0)}%{isValidWeight ? " ✓" : "/100%"}
            </Text>
            {!isValidWeight && (
              <button
                type="button"
                onClick={handleAutoBalance}
                disabled={disabled}
                className="text-xs font-medium transition-colors hover:text-[var(--primary)]"
                style={{ color: "var(--text-muted)" }}
              >
                Auto-balance
              </button>
            )}
          </div>
        )}
      </div>

      {/* Category List */}
      {rubrics.length === 0 ? (
        <button
          type="button"
          onClick={handleAddCategory}
          disabled={disabled}
          className="w-full py-6 rounded-lg border border-dashed text-center transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--surface-1)]"
          style={{ borderColor: "var(--border)" }}
        >
          <Plus
            className="h-5 w-5 mx-auto mb-2 opacity-40"
            style={{ color: "var(--text-muted)" }}
          />
          <Text size="sm" muted>
            Add your first category
          </Text>
        </button>
      ) : (
        <div className="relative">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2">
            <div className="space-y-1">
              {rubrics.map((category, index) => (
                <CategoryEditorRow
                  key={category.id}
                  category={category}
                  index={index}
                  disabled={disabled}
                  isDragging={draggedIndex === index}
                  onUpdate={(updates) => handleUpdateCategory(index, updates)}
                  onRemove={() => handleRemoveCategory(index)}
                  onWeightChange={(weight) => handleWeightChange(index, weight)}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>

            {/* Add Category - subtle inline button */}
            {rubrics.length < maxCategories && (
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={disabled}
                className="flex items-center gap-1.5 px-2 py-1.5 mt-1 text-xs font-medium transition-colors hover:text-[var(--primary)]"
                style={{ color: "var(--text-muted)" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Category
              </button>
            )}
          </div>

          {/* Weight warning — absolute to avoid layout shift */}
          <Text
            size="tiny"
            className={cn(
              "absolute left-0 top-full mt-1",
              isValidWeight && "invisible pointer-events-none"
            )}
            style={{ color: "var(--destructive)" }}
          >
            {totalWeight < 100
              ? `Weights need ${(100 - totalWeight).toFixed(0)}% more`
              : `Weights ${(totalWeight - 100).toFixed(0)}% over`}
          </Text>
        </div>
      )}
    </div>
  );
}

// Category Editor Row Component - Clean, minimal layout
interface CategoryEditorRowProps {
  category: RatingRubric;
  index: number;
  disabled: boolean;
  isDragging: boolean;
  onUpdate: (updates: Partial<RatingRubric>) => void;
  onRemove: () => void;
  onWeightChange: (weight: number) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function CategoryEditorRow({
  category,
  index,
  disabled,
  isDragging,
  onUpdate,
  onRemove,
  onWeightChange,
  onDragStart,
  onDragOver,
  onDragEnd,
}: CategoryEditorRowProps) {
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightInputValue, setWeightInputValue] = useState(category.weight.toString());
  const weightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingWeight && weightInputRef.current) {
      weightInputRef.current.focus();
      weightInputRef.current.select();
    }
  }, [editingWeight]);

  useEffect(() => {
    setWeightInputValue(category.weight.toString());
  }, [category.weight]);

  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-1.5 py-1.5 px-1 rounded-md transition-all",
        "hover:bg-[var(--surface-1)]",
        isDragging && "opacity-50 scale-[0.98] bg-[var(--surface-1)]",
        disabled && "opacity-60"
      )}
    >
      {/* Drag Handle - desktop only, appears on hover */}
      <button
        type="button"
        className="hidden sm:block cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        disabled={disabled}
        aria-label="Drag to reorder"
      >
        <DotsSixVertical className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
      </button>

      {/* Lock Button */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onUpdate({ locked: !category.locked })}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center h-6 w-6 shrink-0 rounded transition-colors",
          category.locked
            ? "bg-[var(--surface-3)] text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
            : "hover:bg-[var(--hover)]"
        )}
        title={category.locked ? "Unlock weight" : "Lock weight"}
      >
        {category.locked ? (
          <Lock className="h-3 w-3" weight="fill" />
        ) : (
          <LockOpen className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
        )}
      </button>

      {/* Weight: compact [-] 20% [+] */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onWeightChange(category.weight - 1)}
          disabled={disabled || category.locked || category.weight <= 0}
          className={cn(
            "flex items-center justify-center h-6 w-6 shrink-0 rounded border border-[var(--border-hover)]",
            category.locked || category.weight <= 0
              ? "invisible pointer-events-none"
              : "hover:bg-[var(--hover)]"
          )}
        >
          <Minus className="h-2.5 w-2.5" style={{ color: "var(--text-muted)" }} />
        </button>
        {editingWeight ? (
          <div className="relative">
            <input
              ref={weightInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={weightInputValue}
              onChange={(e) => setWeightInputValue(e.target.value)}
              onBlur={() => {
                const val = parseFloat(weightInputValue);
                if (!isNaN(val)) {
                  onWeightChange(val);
                }
                setEditingWeight(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={disabled || category.locked}
              className="w-10 h-6 text-xs font-mono text-center bg-[var(--surface-0)] border border-[var(--primary)] rounded outline-none pr-3"
              style={{ color: "var(--text-primary)" }}
            />
            <span
              className="absolute right-1 inset-y-0 flex items-center text-[10px] font-mono pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            >
              %
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!category.locked && !disabled) {
                setWeightInputValue(category.weight.toString());
                setEditingWeight(true);
              }
            }}
            className={cn(
              "h-6 px-1 text-xs font-mono tabular-nums rounded transition-colors whitespace-nowrap",
              !category.locked && !disabled && "hover:bg-[var(--surface-2)]"
            )}
            style={{ color: "var(--text-primary)" }}
            disabled={disabled || category.locked}
          >
            {category.weight}%
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onWeightChange(category.weight + 1)}
          disabled={disabled || category.locked || category.weight >= 100}
          className={cn(
            "flex items-center justify-center h-6 w-6 shrink-0 rounded border border-[var(--border-hover)]",
            category.locked || category.weight >= 100
              ? "invisible pointer-events-none"
              : "hover:bg-[var(--hover)]"
          )}
        >
          <Plus className="h-2.5 w-2.5" style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Name Input — gets the remaining space */}
      <Input
        value={category.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder={`Category ${index + 1}`}
        disabled={disabled}
        className="flex-1 min-w-0 h-7 text-sm rounded-md border border-[var(--border)] bg-[var(--surface-0)] focus:border-[var(--primary)]"
      />

      {/* Delete Button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-1 shrink-0 rounded transition-all hover:bg-[var(--destructive)]/10"
        title="Remove category"
      >
        <Trash className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
      </button>
    </div>
  );
}

export default RubricEditor;
