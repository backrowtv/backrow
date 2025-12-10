"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toggleFavoriteClub } from "@/app/actions/clubs";
import { Button } from "@/components/ui/button";
import { Star } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  clubId: string;
  isFavorite: boolean;
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  variant?: "icon" | "button";
  className?: string;
}

export function FavoriteButton({
  clubId,
  isFavorite: initialIsFavorite,
  size = "sm",
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, startTransition] = useTransition();
  const [isAnimating, setIsAnimating] = useState(false);
  const router = useRouter();
  const prevFavoriteRef = useRef(initialIsFavorite);

  // Sync local state when prop changes (e.g., after router.refresh())
  useEffect(() => {
    setIsFavorite(initialIsFavorite);
  }, [initialIsFavorite]);

  // Trigger animation when favorite state changes
  useEffect(() => {
    if (prevFavoriteRef.current !== isFavorite) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      prevFavoriteRef.current = isFavorite;
      return () => clearTimeout(timer);
    }
  }, [isFavorite]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    startTransition(async () => {
      const result = await toggleFavoriteClub(clubId);

      if (result && "error" in result && result.error) {
        // Revert optimistic update on error
        setIsFavorite(!newFavoriteState);
        toast.error(result.error);
      } else {
        toast.success(newFavoriteState ? "Club favorited" : "Club unfavorited");
        // Notify navigation components to refresh favorite club data
        // Include details about the action so components can react appropriately
        window.dispatchEvent(
          new CustomEvent("nav-preferences-updated", {
            detail: {
              clubId,
              action: newFavoriteState ? "favorite" : "unfavorite",
              clearedFromNav: result?.clearedFromNav,
            },
          })
        );
        window.dispatchEvent(new CustomEvent("sidebar-preferences-updated"));
        router.refresh();
      }
    });
  };

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleToggle}
        disabled={isPending}
        className="gap-2"
      >
        <Star
          weight={isFavorite ? "fill" : "regular"}
          className={cn(
            "w-5 h-5",
            // Only use keyframe animation OR transition, not both
            isAnimating ? "animate-[star-pop_0.4s_ease-out]" : "transition-colors duration-200",
            isFavorite && "text-[var(--warning)]"
          )}
        />
        <span>{isFavorite ? "Favorited" : "Favorite"}</span>
      </Button>
    );
  }

  // Slightly larger icon sizes for better mobile touch targets
  const iconSizes: Record<string, string> = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
    icon: "w-5 h-5",
    "icon-sm": "w-4 h-4",
  };

  // Larger padding for better touch targets
  const paddingSizes: Record<string, string> = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
    icon: "p-1",
    "icon-sm": "p-0.5",
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        paddingSizes[size],
        "rounded-full",
        "transition-[color,transform] duration-200 ease-out",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--warning)]/50",
        "hover:scale-110 active:scale-95",
        // Minimum touch target size for mobile (44x44px recommended)
        "min-w-[44px] min-h-[44px] flex items-center justify-center",
        isFavorite
          ? "text-[var(--warning)] hover:text-[var(--warning)]/80"
          : "text-[var(--text-muted)] hover:text-[var(--warning)]/80",
        className
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        weight={isFavorite ? "fill" : "regular"}
        className={cn(
          iconSizes[size],
          // Only use keyframe animation OR transition, not both
          isAnimating
            ? isFavorite
              ? "animate-[star-favorite_0.4s_ease-out]"
              : "animate-[star-unfavorite_0.3s_ease-out]"
            : "transition-colors duration-200"
        )}
      />
    </button>
  );
}
