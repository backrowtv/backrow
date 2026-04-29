"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Eye,
  Star,
  FilmReel,
  Detective,
  ChartBar,
  PencilSimple,
  Check,
  CircleNotch,
  X,
  CaretDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { createPrivateNote, updatePrivateNote } from "@/app/actions/notes";
import toast from "react-hot-toast";
import type { CarouselMovie } from "./MovieCarousel";

interface PrivateNote {
  id: string;
  tmdb_id: number;
  note: string;
  created_at: string;
  updated_at: string | null;
}

interface FestivalProgressChecklistProps {
  carouselMovies: CarouselMovie[];
  totalMovies: number;
  watchedCount: number;
  ratedCount: number;
  averageRating: number | null;
  guessingEnabled?: boolean;
  privateNotes?: PrivateNote[];
  clubSlug?: string;
}

// Helper to strip HTML and get preview text
function getPreviewText(html: string, maxLength: number = 60): string {
  const stripped = html.replace(/<[^>]*>/g, "").trim();
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).trim() + "...";
}

// Movie row with inline notes
interface MovieRowProps {
  movie: CarouselMovie;
  guessingEnabled: boolean;
  existingNote: PrivateNote | null;
  onNoteUpdated: () => void;
}

function MovieRow({ movie, guessingEnabled, existingNote, onNoteUpdated }: MovieRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(existingNote?.note || "");
  const [isSaving, startTransition] = useTransition();

  const handleSaveNote = () => {
    if (!movie.tmdb_id) return;

    startTransition(async () => {
      const trimmedNote = noteText.trim();
      if (!trimmedNote) {
        toast.error("Note cannot be empty");
        return;
      }

      let result;
      if (existingNote) {
        result = await updatePrivateNote(existingNote.id, trimmedNote);
      } else {
        result = await createPrivateNote(movie.tmdb_id!, trimmedNote);
      }

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(existingNote ? "Note updated" : "Note saved");
        setIsEditing(false);
        onNoteUpdated();
      }
    });
  };

  const movieUrl = movie.slug ? `/movies/${movie.slug}` : `/movies/${movie.tmdb_id}`;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      {/* Main Row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Mini Poster */}
        <Link href={movieUrl} className="flex-shrink-0">
          <div className="relative w-8 h-12 rounded overflow-hidden hover:scale-105 transition-transform">
            {movie.poster_url ? (
              <Image
                src={movie.poster_url}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <div className="w-full h-full bg-[var(--surface-2)] flex items-center justify-center">
                <FilmReel className="w-3 h-3 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </Link>

        {/* Title */}
        <Link href={movieUrl} className="flex-1 min-w-0 group">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">
            {movie.title}
          </p>
          {movie.year && <p className="text-[10px] text-[var(--text-muted)]">{movie.year}</p>}
        </Link>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Watched indicator */}
          <span
            title={movie.isWatched ? "Watched" : "Not watched"}
            className="flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" weight="regular" />
            {movie.isWatched ? (
              <Check className="w-3.5 h-3.5 text-[var(--success)]" weight="bold" />
            ) : (
              <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)]/30" />
            )}
          </span>

          {/* Rated indicator */}
          <span
            title={
              movie.isRated && movie.userRating
                ? `Rated ${formatRatingDisplay(movie.userRating)}`
                : movie.isRated
                  ? "Rated"
                  : "Not rated"
            }
            className="flex items-center gap-1"
          >
            <Star className="w-3.5 h-3.5 text-[var(--text-muted)]" weight="regular" />
            {movie.isRated ? (
              <Check className="w-3.5 h-3.5 text-[var(--primary)]" weight="bold" />
            ) : (
              <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)]/30" />
            )}
          </span>

          {/* Guessed indicator (if enabled) */}
          {guessingEnabled && (
            <span title="Guess nominator">
              <Detective className="w-4 h-4 text-[var(--text-muted)]/40" weight="regular" />
            </span>
          )}

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <CaretDown
              className={cn(
                "w-3.5 h-3.5 transition-transform",
                isExpanded ? "rotate-180" : "rotate-0"
              )}
              weight="bold"
            />
          </button>
        </div>
      </div>

      {/* Expanded Note Section */}
      {isExpanded && (
        <div className="px-3 pb-3 bg-[var(--surface-1)]">
          <div className="ml-10 pt-2 space-y-2">
            {isEditing ? (
              <>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a private note about this movie..."
                  rows={2}
                  className="text-xs min-h-[50px] bg-[var(--surface-0)]"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setNoteText(existingNote?.note || "");
                    }}
                    disabled={isSaving}
                    className="h-6 text-xs"
                  >
                    <X className="w-3 h-3 mr-0.5" />
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={isSaving || !noteText.trim()}
                    className="h-6 text-xs"
                  >
                    {isSaving ? (
                      <CircleNotch className="w-3 h-3 mr-0.5 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 mr-0.5" />
                    )}
                    Save
                  </Button>
                </div>
              </>
            ) : existingNote ? (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-xs text-[var(--text-secondary)] italic">
                  {getPreviewText(existingNote.note, 150)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-5 w-5 p-0 flex-shrink-0"
                >
                  <PencilSimple className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                + Add a private note...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const INITIAL_VISIBLE_MOVIES = 10;

export function FestivalProgressChecklist({
  carouselMovies,
  totalMovies,
  watchedCount,
  ratedCount,
  averageRating,
  guessingEnabled = false,
  privateNotes = [],
}: FestivalProgressChecklistProps) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  // Create lookup for private notes by tmdb_id
  const notesMap = useMemo(
    () => new Map(privateNotes.map((note) => [note.tmdb_id, note])),
    [privateNotes]
  );

  // Calculate progress percentages
  const watchedPercent = totalMovies > 0 ? (watchedCount / totalMovies) * 100 : 0;
  const ratedPercent = totalMovies > 0 ? (ratedCount / totalMovies) * 100 : 0;

  const visibleMovies = showAll ? carouselMovies : carouselMovies.slice(0, INITIAL_VISIBLE_MOVIES);
  const hasMore = carouselMovies.length > INITIAL_VISIBLE_MOVIES;

  if (totalMovies === 0) return null;

  return (
    <Card variant="default">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChartBar className="w-4 h-4" style={{ color: "var(--primary)" }} />
          Your Festival Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Progress Summary */}
        <div className="grid grid-cols-2 gap-3">
          {/* Watched Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] flex items-center gap-1">
                <Eye className="w-3 h-3" /> Watched
              </span>
              <span className="font-medium text-[var(--text-primary)]">
                {watchedCount}/{totalMovies}
              </span>
            </div>
            <Progress value={watchedPercent} className="h-1.5" />
          </div>

          {/* Rated Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] flex items-center gap-1">
                <Star className="w-3 h-3" /> Rated
              </span>
              <span className="font-medium text-[var(--text-primary)]">
                {ratedCount}/{totalMovies}
              </span>
            </div>
            <Progress value={ratedPercent} className="h-1.5" />
          </div>
        </div>

        {/* Average Rating (if has ratings) */}
        {averageRating !== null && ratedCount > 0 && (
          <div className="flex items-center justify-center pt-1 pb-2 border-b border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)] mr-2">Your Average:</span>
            <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
              {formatRatingDisplay(averageRating)}
            </span>
          </div>
        )}

        {/* Movie Checklist */}
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-0)]">
          {visibleMovies.map((movie) => (
            <MovieRow
              key={movie.id}
              movie={movie}
              guessingEnabled={guessingEnabled}
              existingNote={movie.tmdb_id ? notesMap.get(movie.tmdb_id) || null : null}
              onNoteUpdated={() => router.refresh()}
            />
          ))}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="w-full text-center text-xs font-medium py-2 px-4 rounded-md bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors text-[var(--text-secondary)]"
          >
            {showAll
              ? "Show fewer"
              : `Show all ${carouselMovies.length} movies (${carouselMovies.length - INITIAL_VISIBLE_MOVIES} more)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
