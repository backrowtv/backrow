"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { RecentlyWatchedCarousel } from "./RecentlyWatchedCarousel";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { hideFromWatchHistory } from "@/app/actions/activity";
import type { WatchedMovie } from "./RecentlyWatched";

interface RecentlyWatchedClientProps {
  movies: WatchedMovie[];
}

export function RecentlyWatchedClient({ movies }: RecentlyWatchedClientProps) {
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleMovies = movies.filter((m) => !removedIds.has(m.tmdb_id));
  const pendingMovie = movies.find((m) => m.tmdb_id === pendingRemoveId);

  const handleRemoveRequest = (tmdbId: number) => {
    setPendingRemoveId(tmdbId);
  };

  const handleConfirmRemove = () => {
    if (pendingRemoveId === null) return;

    const tmdbId = pendingRemoveId;
    setPendingRemoveId(null);

    // Optimistically remove
    setRemovedIds((prev) => new Set(prev).add(tmdbId));

    startTransition(async () => {
      const result = await hideFromWatchHistory(tmdbId);

      if ("error" in result) {
        // Revert on failure
        setRemovedIds((prev) => {
          const next = new Set(prev);
          next.delete(tmdbId);
          return next;
        });
        toast.error(result.error);
      } else {
        toast("Hidden from recently watched", {
          style: {
            background: "var(--surface-2)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          },
        });
      }
    });
  };

  return (
    <>
      <RecentlyWatchedCarousel movies={visibleMovies} onRemove={handleRemoveRequest} />

      <ConfirmationDialog
        open={pendingRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveId(null);
        }}
        title="Hide from recently watched?"
        description={
          pendingMovie
            ? `This will hide "${pendingMovie.title}" from your recently watched section. The movie will still count as watched.`
            : "This will hide this movie from your recently watched section. The movie will still count as watched."
        }
        confirmText="Hide"
        variant="default"
        isLoading={isPending}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
}
