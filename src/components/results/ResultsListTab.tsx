"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, FilmReel, Trophy } from "@phosphor-icons/react";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollFade } from "./ScrollFade";

interface MovieResult {
  rank: number;
  nomination_id: string;
  movie_title: string;
  poster_url: string | null;
  average_rating: number;
  rating_count: number;
  nominator_name: string;
  nominator_id: string | null;
  nominator_avatar?: string | null;
  nominator_email?: string | null;
  nominator_social_links?: {
    avatar_icon?: string;
    avatar_color_index?: number;
    avatar_border_color_index?: number;
    [key: string]: unknown;
  } | null;
  points?: number;
}

interface ResultsListTabProps {
  movies: MovieResult[];
  scoringEnabled?: boolean;
  /** Points awarded per movie (keyed by nomination_id). */
  pointsMap?: Record<string, number>;
}

function MovieRow({
  movie,
  scoringEnabled,
  index,
  points,
}: {
  movie: MovieResult;
  scoringEnabled: boolean;
  index: number;
  points?: number;
}) {
  const isWinner = movie.rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg border transition-colors hover:bg-[var(--surface-2)]"
      style={{
        backgroundColor: movie.rank <= 3 ? "var(--surface-1)" : "transparent",
        borderColor: isWinner ? "var(--primary)" : "var(--border)",
      }}
    >
      {/* Movie poster with rank overlay */}
      <div className="relative w-10 h-[60px] sm:w-11 sm:h-[66px] rounded overflow-hidden shrink-0">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.movie_title}
            fill
            className="object-cover"
            sizes="44px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <FilmReel className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </div>
        )}
        {/* Tiny rank badge in top-left corner */}
        <div
          className="absolute top-0 left-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-br-md"
          style={{
            backgroundColor: isWinner ? "var(--primary)" : "rgba(0,0,0,0.7)",
            color: "var(--text-primary)",
          }}
        >
          {isWinner ? <Trophy className="w-3 h-3" weight="fill" /> : movie.rank}
        </div>
      </div>

      {/* Movie info */}
      <div className="flex-1 min-w-0">
        <h4
          className="font-medium text-xs sm:text-sm leading-tight line-clamp-2"
          style={{ color: "var(--text-primary)" }}
        >
          {movie.movie_title}
        </h4>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <ClickableUserAvatar
            entity={userToAvatarData({
              avatar_url: movie.nominator_avatar || null,
              display_name: movie.nominator_name,
              email: movie.nominator_email || null,
            })}
            userId={movie.nominator_id}
            size="tiny"
          />
          <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
            {movie.nominator_name}
          </span>
        </div>
      </div>

      {/* Rating + Points stacked vertically to save horizontal space */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-0.5">
          <Star
            className="w-3 h-3 fill-current"
            style={{ color: isWinner ? "var(--primary)" : "var(--text-muted)" }}
          />
          <span
            className="font-semibold text-xs tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {formatRatingDisplay(movie.average_rating)}
          </span>
        </div>
        {scoringEnabled && points !== undefined && (
          <div
            className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isWinner ? "var(--primary)" : "var(--surface-2)",
              color: "var(--text-primary)",
            }}
          >
            +{points.toFixed(1)} {points === 1 ? "pt" : "pts"}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ResultsListTab({ movies, scoringEnabled = true, pointsMap }: ResultsListTabProps) {
  // Sort movies by rank
  const sortedMovies = [...movies].sort((a, b) => a.rank - b.rank);

  if (movies.length === 0) {
    return <EmptyState icon={FilmReel} title="No results available" variant="inline" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex items-center gap-2 sm:gap-3 px-2 py-2 text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        <div className="w-10 sm:w-11" /> {/* Poster + rank space */}
        <div className="flex-1">Movie</div>
        <div className="text-right">Rating</div>
      </div>

      {/* Movie list */}
      <ScrollFade maxHeight="400px">
        <div className="space-y-2">
          {sortedMovies.map((movie, index) => (
            <MovieRow
              key={movie.nomination_id}
              movie={movie}
              scoringEnabled={scoringEnabled}
              index={index}
              points={pointsMap?.[movie.nomination_id]}
            />
          ))}
        </div>
      </ScrollFade>

      {/* Summary footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {movies.length} {movies.length === 1 ? "movie" : "movies"} ranked
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Avg rating:{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {formatRatingDisplay(
              movies.reduce((sum, m) => sum + m.average_rating, 0) / movies.length
            )}
          </span>
        </span>
      </div>
    </div>
  );
}
