"use client";

import { useState, useCallback } from "react";
import { EndlessFestivalViewWrapper } from "./EndlessFestivalViewWrapper";
import { MovieMemberPanel } from "./MovieMemberPanel";
import { EmbeddedDiscussion } from "@/components/discussions/EmbeddedDiscussion";
import type { DiscussionThreadMap } from "./EndlessFestivalView";
import type { ClubRatingSettings } from "./EndlessFestivalSection";
import type { EndlessMovie } from "@/app/actions/endless-festival";

// Extended type for movies with watch/rate state
interface EnhancedEndlessMovie extends EndlessMovie {
  isWatched?: boolean;
  isRated?: boolean;
  userRating?: number;
}

interface EndlessFestivalPageClientProps {
  clubId: string;
  clubSlug: string;
  clubName: string;
  festivalId: string | null;
  festivalName: string | null;
  nowPlaying: EnhancedEndlessMovie[];
  pool: EnhancedEndlessMovie[];
  recentlyPlayed: EnhancedEndlessMovie[];
  discussionThreads: DiscussionThreadMap;
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  festivalType?: "standard" | "endless";
  ratingSettings?: ClubRatingSettings;
}

export function EndlessFestivalPageClient({
  clubId,
  clubSlug,
  clubName,
  festivalId,
  festivalName,
  nowPlaying,
  pool,
  recentlyPlayed,
  discussionThreads,
  isAdmin,
  isMember,
  currentUserId,
  festivalType,
  ratingSettings,
}: EndlessFestivalPageClientProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleActiveIndexChange = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const selectedMovie = nowPlaying[selectedIndex] || nowPlaying[0] || null;

  return (
    <div className="space-y-6">
      {/* Festival carousel */}
      <EndlessFestivalViewWrapper
        clubId={clubId}
        clubSlug={clubSlug}
        clubName={clubName}
        festivalId={festivalId}
        festivalName={festivalName}
        nowPlaying={nowPlaying}
        pool={pool}
        recentlyPlayed={recentlyPlayed}
        discussionThreads={discussionThreads}
        isAdmin={isAdmin}
        isMember={isMember}
        currentUserId={currentUserId}
        festivalType={festivalType}
        ratingSettings={ratingSettings}
        onActiveIndexChange={handleActiveIndexChange}
      />

      {/* Movie detail sections — only when a movie is selected */}
      {selectedMovie && (
        <div className="space-y-4">
          {/* Member watch/rating panel — collapsed by default */}
          <MovieMemberPanel
            clubId={clubId}
            selectedTmdbId={selectedMovie.tmdb_id}
            selectedMovieTitle={selectedMovie.title}
            ratingSettings={ratingSettings}
            defaultCollapsed
          />

          {/* Discussion thread for selected movie */}
          <EmbeddedDiscussion
            clubId={clubId}
            clubSlug={clubSlug}
            currentUserId={currentUserId}
            tmdbId={selectedMovie.tmdb_id}
            movieTitle={selectedMovie.title}
            moviePosterUrl={selectedMovie.poster_url}
            isAdmin={isAdmin}
            hideCreateForm
          />
        </div>
      )}
    </div>
  );
}
