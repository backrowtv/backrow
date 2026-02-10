"use client";

import { useState } from "react";
import { Text } from "@/components/ui/typography";
import { BadgeCategoryRow } from "./BadgeCategoryRow";
import { FeaturedBadgeSelector } from "@/components/id-cards/FeaturedBadgeSelector";
import { updateClubFeaturedBadges } from "@/app/actions/club-badges";
import type { ClubBadgeData, ClubBadgeCategoryId } from "@/types/club-badges";
import { CLUB_BADGE_TIER_LABELS } from "@/types/club-badges";
import type { BadgeCategoryId } from "@/types/badges";
import type { FeaturedBadge } from "@/types/id-card";

interface ClubChallengesSectionProps {
  clubId: string;
  badgeData: ClubBadgeData;
  currentFeaturedIds: string[];
  canEdit: boolean; // Only producers/directors can edit
  onBadgeSelectionSave?: () => void;
}

// Map club categories to user badge category IDs (for BadgeCategoryRow prop compatibility)
const CATEGORY_MAP: Record<ClubBadgeCategoryId, BadgeCategoryId> = {
  festivals_completed: "festivals_participated",
  movies_watched: "movies_watched",
  members: "festivals_participated",
  seasons_completed: "festivals_participated",
};

// Color keys for club categories — maps to distinct colors in BadgeCategoryRow
const CLUB_COLOR_KEYS: Record<ClubBadgeCategoryId, string> = {
  festivals_completed: "festivals_completed",
  movies_watched: "club_movies_watched",
  members: "members",
  seasons_completed: "seasons_completed",
};

export function ClubChallengesSection({
  clubId,
  badgeData,
  currentFeaturedIds: initialFeaturedIds,
  canEdit,
  onBadgeSelectionSave,
}: ClubChallengesSectionProps) {
  const { categories, earnedBadgeIds } = badgeData;
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);

  // Count total earned
  const totalEarned = earnedBadgeIds.length;
  const totalBadges = categories.reduce((sum, cat) => sum + cat.badges.length, 0);

  // Derive earned badges for the selector modal
  const earnedBadges: FeaturedBadge[] = categories.flatMap((cat) =>
    cat.badges
      .filter((b) => b.earned)
      .map((b, i) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon_url: b.icon_url,
        category: CATEGORY_MAP[cat.category],
        tier: i + 1,
      }))
  );

  const handleSelectorSave = () => {
    onBadgeSelectionSave?.();
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <Text size="sm" className="font-semibold text-[var(--text-primary)]">
            Club Challenges
          </Text>
          <div className="flex items-center gap-3">
            <Text size="tiny" muted>
              {totalEarned}/{totalBadges} earned
            </Text>
            {canEdit && (
              <FeaturedBadgeSelector
                earnedBadges={earnedBadges}
                currentFeaturedIds={featuredIds}
                onSave={handleSelectorSave}
                onFeaturedIdsChange={setFeaturedIds}
                maxBadges={3}
                saveAction={(ids) => updateClubFeaturedBadges(clubId, ids)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Badge Categories */}
      <div className="divide-y divide-[var(--border)]">
        {categories.map((category) => {
          const earnedCount = category.badges.filter((b) => b.earned).length;
          // Map to compatible BadgeCategoryId for BadgeCategoryRow
          const mappedCategory = CATEGORY_MAP[category.category];

          return (
            <div key={category.category} className="p-4">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Text size="sm" className="font-medium">
                    {category.displayName}
                  </Text>
                </div>
                <Text size="tiny" muted className="tabular-nums">
                  {earnedCount}/{category.badges.length}
                </Text>
              </div>

              {/* Badges */}
              <BadgeCategoryRow
                badges={category.badges}
                currentValue={category.currentValue}
                featuredIds={canEdit ? featuredIds : []}
                category={mappedCategory}
                colorKey={CLUB_COLOR_KEYS[category.category]}
                customTierLabels={CLUB_BADGE_TIER_LABELS[category.category]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
