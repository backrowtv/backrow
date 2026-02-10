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

function getRankBadgeStyle(rank: number) {
  if (rank === 1) {
    return {
      bg: "var(--primary)",
      text: "var(--text-primary)",
      icon: Trophy,
    };
  } else if (rank === 2) {
    return {
      bg: "var(--surface-3)",
      text: "var(--text-primary)",
      icon: null,
    };
  } else if (rank === 3) {
    return {
      bg: "var(--surface-2)",
      text: "var(--text-primary)",
      icon: null,
    };
  }
  return {
    bg: "var(--surface-1)",
    text: "var(--text-secondary)",
    icon: null,
  };
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
  const rankStyle = getRankBadgeStyle(movie.rank);
  const RankIcon = rankStyle.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-2)]"
      style={{
        backgroundColor: movie.rank <= 3 ? "var(--surface-1)" : "transparent",
        borderColor: movie.rank === 1 ? "var(--primary)" : "var(--border)",
      }}
    >
      {/* Rank badge */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
        style={{ backgroundColor: rankStyle.bg, color: rankStyle.text }}
      >
        {RankIcon ? <RankIcon className="w-4 h-4" /> : movie.rank}
      </div>

      {/* Movie poster */}
      <div className="relative w-12 h-[72px] rounded overflow-hidden shrink-0">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.movie_title}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <FilmReel className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </div>
        )}
      </div>

      {/* Movie info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
          {movie.movie_title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <ClickableUserAvatar
            entity={userToAvatarData({
              avatar_url: movie.nominator_avatar || null,
              display_name: movie.nominator_name,
              email: movie.nominator_email || null,
            })}
            userId={movie.nominator_id}
            size="tiny"
          />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {movie.nominator_name}
          </span>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1 shrink-0">
        <Star
          className="w-4 h-4 fill-current"
          style={{ color: movie.rank === 1 ? "var(--primary)" : "var(--text-muted)" }}
        />
        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          {formatRatingDisplay(movie.average_rating)}
        </span>
      </div>

      {/* Points (if scoring enabled) */}
      {scoringEnabled && points !== undefined && (
        <div
          className="text-sm font-medium shrink-0 px-2 py-1 rounded"
          style={{
            backgroundColor: movie.rank === 1 ? "var(--primary)" : "var(--surface-2)",
            color: "var(--text-primary)",
          }}
        >
          +{points.toFixed(1)} {points === 1 ? "pt" : "pts"}
        </div>
      )}
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
        className="flex items-center gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        <div className="w-8 text-center">#</div>
        <div className="w-12" /> {/* Poster space */}
        <div className="flex-1">Movie</div>
        <div className="w-14 text-center">Rating</div>
        {scoringEnabled && <div className="w-20 text-center">Points</div>}
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
