"use client";

import { useState } from "react";
import { Text } from "@/components/ui/typography";
import { BadgeCategoryRow } from "./BadgeCategoryRow";
import { AchievementBadgeRow } from "./AchievementBadgeRow";
import { FeaturedBadgeSelector } from "@/components/id-cards/FeaturedBadgeSelector";
import type { UserBadgeData, BadgeCategoryId } from "@/types/badges";
import type { FeaturedBadge } from "@/types/id-card";

interface ChallengesSectionProps {
  badgeData: UserBadgeData;
  currentFeaturedIds: string[];
  onBadgeSelectionSave?: () => void;
}

export function ChallengesSection({
  badgeData,
  currentFeaturedIds: initialFeaturedIds,
  onBadgeSelectionSave,
}: ChallengesSectionProps) {
  const { categories, achievements, earnedBadgeIds } = badgeData;
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);

  const totalBadges =
    categories.reduce((sum, cat) => sum + cat.badges.length, 0) + (achievements?.length || 0);
  const totalEarned = earnedBadgeIds.length;

  // Derive earned badges for the selector modal (tiered + achievements)
  const earnedBadges: FeaturedBadge[] = [
    ...categories.flatMap((cat) =>
      cat.badges
        .filter((b) => b.earned)
        .map((b, i) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon_url: b.icon_url,
          category: cat.category,
          tier: i + 1,
        }))
    ),
    ...(achievements || [])
      .filter((b) => b.earned)
      .map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon_url: b.icon_url,
        category: "achievements" as BadgeCategoryId,
        tier: 0,
      })),
  ];

  const handleSelectorSave = () => {
    onBadgeSelectionSave?.();
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Challenges</h3>
          <Text size="tiny" muted className="tabular-nums">
            {totalEarned}/{totalBadges} earned
          </Text>
        </div>
        <FeaturedBadgeSelector
          earnedBadges={earnedBadges}
          currentFeaturedIds={featuredIds}
          onSave={handleSelectorSave}
          onFeaturedIdsChange={setFeaturedIds}
          maxBadges={3}
        />
      </div>

      <div className="divide-y divide-[var(--border)]">
        {/* Badge categories — flat dividers */}
        {categories.map((category) => {
          const earnedCount = category.badges.filter((b) => b.earned).length;

          return (
            <div key={category.category} className="py-4">
              <div className="flex items-center justify-between mb-3">
                <Text size="sm" className="font-medium text-[var(--text-primary)]">
                  {category.displayName}
                </Text>
                <Text size="tiny" muted className="tabular-nums">
                  {earnedCount}/{category.badges.length}
                </Text>
              </div>

              <BadgeCategoryRow
                badges={category.badges}
                currentValue={category.currentValue}
                featuredIds={featuredIds}
                category={category.category}
              />
            </div>
          );
        })}

        {/* Achievement badges — one-off, not tiered */}
        {achievements && achievements.length > 0 && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <Text size="sm" className="font-medium text-[var(--text-primary)]">
                Other
              </Text>
              <Text size="tiny" muted className="tabular-nums">
                {achievements.filter((b) => b.earned).length}/{achievements.length}
              </Text>
            </div>
            <AchievementBadgeRow badges={achievements} featuredIds={featuredIds} />
          </div>
        )}
      </div>
    </div>
  );
}
