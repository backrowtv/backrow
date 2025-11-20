"use client";

import { useRouter } from "next/navigation";
import { ChallengesSection } from "@/components/badges/ChallengesSection";
import type { UserBadgeData } from "@/types/badges";

interface ChallengesSectionWrapperProps {
  badgeData: UserBadgeData;
  currentFeaturedIds: string[];
}

export function ChallengesSectionWrapper({
  badgeData,
  currentFeaturedIds,
}: ChallengesSectionWrapperProps) {
  const router = useRouter();

  const handleBadgeSelectionSave = () => {
    router.refresh();
  };

  return (
    <ChallengesSection
      badgeData={badgeData}
      currentFeaturedIds={currentFeaturedIds}
      onBadgeSelectionSave={handleBadgeSelectionSave}
    />
  );
}
