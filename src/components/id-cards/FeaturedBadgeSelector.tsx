"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Text } from "@/components/ui/typography";
import { Trophy, Plus, X } from "@phosphor-icons/react";
import Image from "next/image";
import { updateFeaturedBadges } from "@/app/actions/id-card";
import type { FeaturedBadge } from "@/types/id-card";

interface FeaturedBadgeSelectorProps {
  earnedBadges: FeaturedBadge[];
  currentFeaturedIds: string[];
  onSave?: () => void;
  onFeaturedIdsChange?: (ids: string[]) => void;
  maxBadges?: number;
  saveAction?: (ids: string[]) => Promise<{ success: boolean } | { error: string }>;
}

/**
 * FeaturedBadgeSelector - Inline slots for selecting which badges to feature on ID card
 *
 * Shows 3 circular slots. Tap an empty slot to open a picker modal.
 * Tap a filled slot to remove it.
 */
export function FeaturedBadgeSelector({
  earnedBadges,
  currentFeaturedIds,
  onSave,
  onFeaturedIdsChange,
  maxBadges = 3,
  saveAction,
}: FeaturedBadgeSelectorProps) {
  const [featuredIds, setFeaturedIds] = useState<string[]>(currentFeaturedIds);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [_slotIndex, setSlotIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Resolve badge objects for filled slots
  const filledBadges = featuredIds.map((id) => earnedBadges.find((b) => b.id === id) || null);

  // Pad to maxBadges slots
  const slots = Array.from({ length: maxBadges }, (_, i) => filledBadges[i] ?? null);

  const handleSlotClick = (index: number) => {
    const badge = slots[index];
    if (badge) {
      // Remove badge from this slot
      const newIds = featuredIds.filter((id) => id !== badge.id);
      saveFeaturedIds(newIds);
    } else {
      // Open picker for this slot
      setSlotIndex(index);
      setPickerOpen(true);
    }
  };

  const handlePickBadge = (badgeId: string) => {
    const newIds = [...featuredIds, badgeId];
    setPickerOpen(false);
    setSlotIndex(null);
    saveFeaturedIds(newIds);
  };

  const saveFeaturedIds = (ids: string[]) => {
    setError(null);
    // Optimistically update local state
    setFeaturedIds(ids);
    onFeaturedIdsChange?.(ids);

    startTransition(async () => {
      const action = saveAction || updateFeaturedBadges;
      const result = await action(ids);
      if ("error" in result) {
        setError(result.error);
        // Revert on error
        setFeaturedIds(featuredIds);
        onFeaturedIdsChange?.(featuredIds);
      } else {
        onSave?.();
      }
    });
  };

  // Available badges for the picker (not already featured)
  const availableBadges = earnedBadges.filter((b) => !featuredIds.includes(b.id));

  return (
    <>
      {/* Inline slots */}
      <div className="flex items-center gap-2">
        <Text size="tiny" muted className="mr-1">
          Featured
        </Text>
        {slots.map((badge, index) => (
          <button
            key={index}
            onClick={() => handleSlotClick(index)}
            disabled={isPending}
            className={cn(
              "relative w-9 h-9 rounded-full flex items-center justify-center transition-all",
              "border-2 border-dashed",
              badge
                ? "border-transparent bg-[var(--surface-2)] hover:opacity-80"
                : "border-[var(--border)] hover:border-[var(--text-muted)] bg-transparent",
              isPending && "opacity-50"
            )}
            title={badge ? `Remove ${badge.name}` : "Add featured badge"}
            aria-label={badge ? `Remove ${badge.name} from featured` : "Add featured badge"}
          >
            {badge ? (
              <>
                {badge.icon_url ? (
                  <Image
                    src={badge.icon_url}
                    alt={badge.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 object-contain rounded-full"
                  />
                ) : (
                  <Trophy className="w-4 h-4 text-[var(--primary)]" weight="fill" />
                )}
                {/* Remove indicator on hover */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                  <X className="w-3.5 h-3.5 text-white" weight="bold" />
                </div>
              </>
            ) : (
              <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </button>
        ))}
      </div>

      {/* Picker modal */}
      <Modal
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPickerOpen(false);
            setSlotIndex(null);
            setError(null);
          }
        }}
        title="Choose a Badge"
        size="md"
      >
        <div className="space-y-4">
          {availableBadges.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-30" />
              <Text size="sm" muted className="mt-2">
                {earnedBadges.length === 0
                  ? "No badges earned yet. Complete challenges to earn badges!"
                  : "All earned badges are already featured."}
              </Text>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {availableBadges.map((badge) => (
                <button
                  key={badge.id}
                  onClick={() => handlePickBadge(badge.id)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg transition-all",
                    "border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-2)]"
                  )}
                  title={badge.name}
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                    {badge.icon_url ? (
                      <Image
                        src={badge.icon_url}
                        alt={badge.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Trophy className="w-6 h-6 text-[var(--primary)]" weight="fill" />
                    )}
                  </div>
                  <Text size="tiny" className="mt-1 text-center line-clamp-2">
                    {badge.name}
                  </Text>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-1.5"
              role="alert"
            >
              <span aria-hidden="true">⚠</span>
              <Text size="sm" className="text-red-500">
                {error}
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
