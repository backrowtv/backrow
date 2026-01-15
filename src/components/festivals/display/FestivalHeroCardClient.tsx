"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FestivalHeroCard } from "./FestivalHeroCard";
import { NominateMovieModal } from "../modals/NominateMovieModal";
import type { FestivalType, ThemeGovernance } from "@/types/club-settings";

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

interface FestivalHeroCardClientProps {
  festival: Festival;
  clubSlug: string;
  clubName: string;
  clubId: string;
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
  themesEnabled?: boolean;
  scoringEnabled?: boolean;
  guessingEnabled?: boolean;
  isOnFestivalPage?: boolean;
  autoAdvance?: boolean;
}

export function FestivalHeroCardClient({
  festival,
  clubSlug,
  clubName,
  clubId,
  festivalType,
  themeGovernance,
  topThemes,
  nominationCount,
  ratingCount,
  participantCount,
  userHasNominated,
  userHasRated,
  isAdmin,
  topNominations,
  onPhaseChange,
  onEditClick,
  themesEnabled,
  scoringEnabled,
  guessingEnabled,
  isOnFestivalPage,
  autoAdvance,
}: FestivalHeroCardClientProps) {
  const router = useRouter();
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);

  const handleNominateSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <FestivalHeroCard
        festival={festival}
        clubSlug={clubSlug}
        clubName={clubName}
        clubId={clubId}
        festivalType={festivalType}
        themeGovernance={themeGovernance}
        topThemes={topThemes}
        nominationCount={nominationCount}
        ratingCount={ratingCount}
        participantCount={participantCount}
        userHasNominated={userHasNominated}
        userHasRated={userHasRated}
        isAdmin={isAdmin}
        topNominations={topNominations}
        onPhaseChange={onPhaseChange}
        onEditClick={onEditClick}
        themesEnabled={themesEnabled}
        scoringEnabled={scoringEnabled}
        guessingEnabled={guessingEnabled}
        isOnFestivalPage={isOnFestivalPage}
        autoAdvance={autoAdvance}
        onNominateClick={() => setIsNominateModalOpen(true)}
      />

      <NominateMovieModal
        open={isNominateModalOpen}
        onOpenChange={setIsNominateModalOpen}
        festivalId={festival.id}
        clubId={clubId}
        clubSlug={clubSlug}
        festivalSlug={festival.slug || festival.id}
        festivalTheme={festival.theme}
        onSuccess={handleNominateSuccess}
      />
    </>
  );
}
