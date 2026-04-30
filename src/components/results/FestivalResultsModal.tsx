"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { DateDisplay } from "@/components/ui/date-display";
import { DebossedTabs } from "@/components/ui/debossed-tabs";
import { MoviePodium } from "./MoviePodium";
import { ResultsListTab } from "./ResultsListTab";
import { RatingsTab } from "./RatingsTab";
import { GuessesTab } from "./GuessesTab";
import { getResultsData } from "@/app/actions/results";
import { ArrowSquareOut, Trophy, Star, Target, ListNumbers } from "@phosphor-icons/react";
import type { FestivalResults } from "@/types/festival-results";
import type {
  NominationWithRelations,
  RatingWithRelations,
  GuessWithRelations,
  MemberForResults,
} from "@/types/results";

interface FestivalResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  festivalId: string;
}

interface ResultsData {
  festival?: {
    theme: string;
    results_date: string | null;
    member_count_at_creation: number;
    slug: string | null;
  };
  clubSlug?: string;
  results?: FestivalResults;
  nominations?: NominationWithRelations[];
  ratings?: RatingWithRelations[];
  guesses?: GuessWithRelations[];
  members?: MemberForResults[];
  revealSettings?: {
    revealType: "automatic" | "manual";
    revealDirection: "forward" | "backward";
    revealDelaySeconds: number;
  };
  displaySettings?: {
    clubRatingsEnabled: boolean;
    nominationGuessingEnabled: boolean;
    blindNominationsEnabled: boolean;
    scoringEnabled: boolean;
  };
  error?: string;
}

// Transform nominations to movie results for podium and list
function transformToMovieResults(
  results: FestivalResults,
  nominations: NominationWithRelations[],
  members: MemberForResults[]
) {
  // Create member lookup
  const memberLookup = new Map<string, { name: string; avatar?: string | null }>();
  members.forEach((m) => {
    if (m.users) {
      memberLookup.set(m.user_id, {
        name: m.users.display_name || m.users.email || "Unknown",
        avatar: null,
      });
    }
  });

  // Sort nominations by average rating
  const sortedNominations = [...(results.nominations || [])]
    .filter((n) => n.tmdb_id !== null)
    .sort((a, b) => b.average_rating - a.average_rating);

  return sortedNominations.map((resultNom, index) => {
    // Find the full nomination data
    const nomination = nominations.find((n) => n.id === resultNom.nomination_id);
    const movie = nomination?.movies;
    const nominatorInfo = resultNom.nominator_user_id
      ? memberLookup.get(resultNom.nominator_user_id)
      : null;

    return {
      rank: index + 1,
      nomination_id: resultNom.nomination_id,
      movie_title: movie?.title || resultNom.movie_title || "Unknown Movie",
      poster_url: movie?.poster_url || null,
      average_rating: resultNom.average_rating,
      rating_count: resultNom.rating_count,
      nominator_name: nominatorInfo?.name || "Unknown",
      nominator_id: resultNom.nominator_user_id,
      nominator_avatar: nominatorInfo?.avatar,
      points: resultNom.average_rating, // Points based on rating for now
    };
  });
}

export function FestivalResultsModal({
  open,
  onOpenChange,
  festivalId,
}: FestivalResultsModalProps) {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<string>("rankings");

  useEffect(() => {
    if (open && festivalId) {
      setLoading(true);
      setError(null);

      async function loadResults() {
        try {
          const result = await getResultsData(festivalId);
          if ("error" in result && result.error) {
            setError(result.error);
            setData(null);
          } else {
            // Transform nominations to match NominationWithRelations type
            const transformedNominations = (result.nominations || []).map((nom: unknown) => {
              const n = nom as {
                id: string;
                tmdb_id: number | null;
                user_id: string | null;
                created_at?: string | null;
                festival_id?: string | null;
                pitch?: string | null;
                movies?: {
                  tmdb_id: number;
                  title: string;
                  poster_url: string | null;
                  year: number | null;
                } | null;
                users?: { id: string; display_name: string | null; email: string } | null;
              };
              return {
                id: n.id,
                tmdb_id: n.tmdb_id,
                user_id: n.user_id,
                created_at: n.created_at || null,
                festival_id: n.festival_id || null,
                pitch: n.pitch || null,
                movies: n.movies || null,
                users: n.users || null,
                deleted_at: null,
              } as NominationWithRelations;
            });

            // Transform ratings
            const transformedRatings = (result.ratings || []).map((rating: unknown) => {
              const r = rating as {
                id: string;
                nomination_id: string | null;
                user_id: string | null;
                rating: number | null;
                users?: { id: string; display_name: string | null; email: string } | null;
              };
              return {
                id: r.id,
                nomination_id: r.nomination_id,
                user_id: r.user_id,
                rating: r.rating,
                users: r.users || null,
                created_at: null,
                deleted_at: null,
                festival_id: null,
                rubric_scores: null,
                review: null,
                // Placeholder fields above (festival_id, nomination_id, user_id) may be
                // null at runtime even though RatingWithRelations declares them as
                // non-null. Downstream RatingsTab only reads `user_id` and `rating`.
              } as unknown as RatingWithRelations;
            });

            // Transform guesses
            const transformedGuesses = (result.guesses || []).map((guess: unknown) => {
              const g = guess as {
                id: string;
                user_id: string | null;
                guesses: Record<string, string>;
                users?: { id: string; display_name: string | null; email: string } | null;
              };
              return {
                id: g.id,
                user_id: g.user_id,
                guesses: g.guesses || {},
                users: g.users || null,
              } as GuessWithRelations;
            });

            // Transform members
            const transformedMembers = (result.members || []).map((member: unknown) => {
              const m = member as {
                user_id: string;
                users?: { id: string; display_name: string | null; email: string } | null;
              };
              return {
                user_id: m.user_id,
                users: m.users || null,
              } as MemberForResults;
            });

            setData({
              festival: result.festival,
              clubSlug: result.clubSlug,
              results: result.results as FestivalResults,
              nominations: transformedNominations,
              ratings: transformedRatings,
              guesses: transformedGuesses,
              members: transformedMembers,
              revealSettings: result.revealSettings,
              displaySettings: result.displaySettings,
            });
          }
        } catch (err) {
          console.error("Error loading results:", err);
          setError("Failed to load results");
        } finally {
          setLoading(false);
        }
      }

      loadResults();
    }
  }, [open, festivalId]);

  const festival = data?.festival;
  const results = data?.results;
  const nominations = useMemo(() => data?.nominations || [], [data?.nominations]);
  const ratings = data?.ratings || [];
  const guesses = data?.guesses || [];
  const members = useMemo(() => data?.members || [], [data?.members]);
  const displaySettings = data?.displaySettings || {
    clubRatingsEnabled: true,
    nominationGuessingEnabled: false,
    blindNominationsEnabled: false,
    scoringEnabled: true,
  };

  // Transform results to movie format for podium and list
  const movieResults = useMemo(() => {
    if (!results || !results.nominations?.length || !nominations.length || !members.length)
      return [];
    return transformToMovieResults(results, nominations, members);
  }, [results, nominations, members]);

  // Determine which tabs to show
  const showRatingsTab = displaySettings.clubRatingsEnabled;
  // Mirror the festival page (page.tsx): showing guesses doesn't require nominations
  // to have been blind during the festival. The data exists; let it render.
  const showGuessesTab = displaySettings.nominationGuessingEnabled;

  // Build festival URL for external link — falls back to festival ID when slug is null
  const festivalUrl = data?.clubSlug
    ? `/club/${data.clubSlug}/festival/${festival?.slug || festivalId}`
    : null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Festival Results"
      titleAlign="center"
      description={
        festival ? (
          <div className="flex flex-col gap-3">
            {festivalUrl && (
              <Link
                href={festivalUrl}
                className="inline-flex items-center gap-1 self-center text-xs font-medium text-[var(--primary)] hover:underline"
              >
                View festival page
                <ArrowSquareOut className="w-3 h-3" weight="bold" />
              </Link>
            )}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 flex flex-col gap-2 min-h-[3.5rem]">
              <div className="flex items-start gap-2">
                <Trophy
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  {festival.theme || "Festival"}
                </span>
              </div>
              {festival.results_date && (
                <div className="text-xs text-[var(--text-muted)] mt-auto self-end">
                  Completed <DateDisplay date={festival.results_date} format="date" />
                </div>
              )}
            </div>
          </div>
        ) : undefined
      }
      size="lg"
    >
      {loading && (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <div
          className="rounded-lg p-4 border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          <p style={{ color: "var(--error)", fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {!loading && !error && results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Podium section */}
          <AnimatePresence>
            {movieResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="pb-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <MoviePodium
                  movies={movieResults}
                  scoringEnabled={displaySettings.scoringEnabled}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs section — debossed glass switcher */}
          <DebossedTabs
            options={[
              { value: "rankings", label: "Rankings", icon: ListNumbers },
              ...(showRatingsTab ? [{ value: "ratings", label: "Ratings", icon: Star }] : []),
              ...(showGuessesTab ? [{ value: "guesses", label: "Guesses", icon: Target }] : []),
            ]}
            value={resultsTab}
            onChange={setResultsTab}
            fullWidth
            compact
          />

          <div className="mt-4">
            {resultsTab === "rankings" && (
              <ResultsListTab
                movies={movieResults}
                scoringEnabled={displaySettings.scoringEnabled}
                pointsMap={
                  displaySettings.scoringEnabled
                    ? Object.fromEntries(
                        movieResults.map((m) => [m.nomination_id, movieResults.length - m.rank + 1])
                      )
                    : undefined
                }
              />
            )}

            {resultsTab === "ratings" && showRatingsTab && (
              <RatingsTab nominations={nominations} ratings={ratings} members={members} />
            )}

            {resultsTab === "guesses" && showGuessesTab && (
              <GuessesTab nominations={nominations} guesses={guesses} members={members} />
            )}
          </div>
        </motion.div>
      )}
    </Modal>
  );
}
