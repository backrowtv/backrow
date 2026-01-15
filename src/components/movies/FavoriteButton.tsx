"use client";

import { useState, useTransition } from "react";
import { Heart } from "@phosphor-icons/react";
import { addFavorite, removeFavorite } from "@/app/actions/profile/favorites";
import type { FavoriteItemType } from "@/types/favorites";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  tmdbId: number;
  itemType: FavoriteItemType;
  title: string;
  imagePath: string | null;
  subtitle: string | null;
  /** If set, the item is already favorited and this is the favorite row ID */
  existingFavoriteId?: string | null;
}

export function FavoriteButton({
  tmdbId,
  itemType,
  title,
  imagePath,
  subtitle,
  existingFavoriteId,
}: FavoriteButtonProps) {
  const [favoriteId, setFavoriteId] = useState<string | null>(existingFavoriteId ?? null);
  const [isPending, startTransition] = useTransition();
  const isFavorited = !!favoriteId;

  function handleToggle() {
    startTransition(async () => {
      if (isFavorited && favoriteId) {
        const result = await removeFavorite(favoriteId);
        if (result.error) {
          toast.error(result.error);
        } else {
          setFavoriteId(null);
          toast.success("Removed from favorites");
        }
      } else {
        const result = await addFavorite(tmdbId, itemType, title, imagePath, subtitle);
        if (result.error) {
          toast.error(result.error);
        } else if (result.data) {
          setFavoriteId(result.data.id);
          toast.success("Added to favorites");
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "p-2 rounded-full transition-all duration-200 disabled:opacity-50",
        isFavorited
          ? "text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20"
          : "text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--surface-2)]"
      )}
    >
      <Heart className="w-5 h-5" weight={isFavorited ? "fill" : "regular"} />
    </button>
  );
}
