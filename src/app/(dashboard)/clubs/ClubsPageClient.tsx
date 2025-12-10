"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, FunnelSimple, CaretDown } from "@phosphor-icons/react";
import { Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { UnifiedClubCard } from "@/components/clubs/UnifiedClubCard";
import { GenreIcon } from "@/components/genres/GenreIcon";
import { getGenreBySlug, CLUB_GENRES } from "@/lib/genres/constants";
import type { UserClub } from "@/app/actions/clubs";

const filterOptions = [
  { value: "all", label: "All" },
  { value: "producer", label: "Producer" },
  { value: "director", label: "Director" },
  { value: "critic", label: "Critic" },
  { value: "following", label: "Following" },
];

interface ClubsPageClientProps {
  memberClubs: UserClub[];
  followingClubs: UserClub[];
}

export function ClubsPageClient({ memberClubs, followingClubs }: ClubsPageClientProps) {
  const [filter, setFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const hasClubs = memberClubs.length > 0 || followingClubs.length > 0;
  const activeFilterLabel = filterOptions.find((o) => o.value === filter)?.label || "All";

  // Collect available genres from all clubs
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    const allClubs = [...memberClubs, ...followingClubs];
    for (const club of allClubs) {
      if (club.genres) {
        for (const g of club.genres) genreSet.add(g);
      }
    }
    return CLUB_GENRES.map((g) => g.slug).filter((slug) => genreSet.has(slug));
  }, [memberClubs, followingClubs]);

  const filteredClubs = useMemo(() => {
    let clubs: UserClub[];
    if (filter === "following") {
      clubs = followingClubs;
    } else if (filter === "all") {
      clubs = memberClubs;
    } else {
      clubs = memberClubs.filter((club) => club.user_role === filter);
    }
    if (genreFilter) {
      clubs = clubs.filter((club) => club.genres?.includes(genreFilter));
    }
    return clubs;
  }, [filter, genreFilter, memberClubs, followingClubs]);

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
        {/* Header Row: Filter Toggle (left) + Create (right) */}
        <div className="flex items-center justify-between gap-2 mb-4">
          {/* Filter Toggle - Mobile collapsible, Desktop always shows pills */}
          {hasClubs && (
            <>
              {/* Mobile: Collapsible filter button */}
              <button
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="md:hidden flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-sm font-medium text-[var(--text-primary)]"
              >
                <FunnelSimple className="w-4 h-4" />
                <span>{activeFilterLabel}</span>
                <CaretDown
                  className={cn("w-3 h-3 transition-transform", isFilterExpanded && "rotate-180")}
                />
              </button>

              {/* Desktop: Always visible filter pills */}
              <div className="hidden md:flex gap-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "flex-shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors",
                      filter === option.value
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Spacer when no clubs */}
          {!hasClubs && <div />}

          {/* Right side: Create Button */}
          <Link href="/create-club">
            <Button size="sm" className="h-8">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create
            </Button>
          </Link>
        </div>

        {/* Mobile: Expanded Filter Pills */}
        {hasClubs && isFilterExpanded && (
          <div className="md:hidden mb-4">
            <ScrollArea className="w-full">
              <div className="flex gap-1 pb-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilter(option.value);
                      setIsFilterExpanded(false);
                    }}
                    className={cn(
                      "flex-shrink-0 h-7 px-2 rounded-full text-xs font-medium transition-colors",
                      filter === option.value
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
          </div>
        )}

        {/* Genre Filter Pills */}
        {availableGenres.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide" data-swipe-ignore>
            {availableGenres.map((slug) => {
              const genre = getGenreBySlug(slug);
              if (!genre) return null;
              const isActive = genreFilter === slug;
              return (
                <button
                  key={slug}
                  onClick={() => setGenreFilter(isActive ? null : slug)}
                  className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border",
                    isActive
                      ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold border-[var(--active-border)]"
                      : "bg-[var(--surface-1)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <GenreIcon slug={slug} size={12} weight={isActive ? "fill" : "bold"} />
                  {genre.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Clubs Display */}
        {filteredClubs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3">
              <Sparkle className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              {filter === "following" ? "No followed clubs" : "No clubs yet"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              {filter === "following"
                ? "Follow public clubs to see them here"
                : "Create or join a club to get started"}
            </p>
            {filter !== "following" && (
              <Link href="/create-club">
                <Button size="sm">Create Club</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClubs
              .filter((club) => club.slug)
              .map((club) => (
                <UnifiedClubCard
                  key={club.id}
                  club={{
                    ...club,
                    slug: club.slug!,
                    is_member: true,
                  }}
                  showFavorite={!!club.user_role}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
