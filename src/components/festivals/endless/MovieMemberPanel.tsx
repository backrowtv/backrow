"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { RatingDisplay } from "@/components/ratings/RatingDisplay";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { getMovieMemberActivity } from "@/app/actions/endless-festival/member-activity";
import type { MemberActivity } from "@/app/actions/endless-festival/member-activity.types";
import { Eye, EyeSlash, MagnifyingGlass, CaretDown, Users } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ClubRatingSettings } from "./EndlessFestivalSection";

type FilterMode = "all" | "watched" | "not_watched" | "rated";
type SortMode = "name" | "rating_desc" | "watched_date";

const PAGE_SIZE = 10;

interface MovieMemberPanelProps {
  clubId: string;
  selectedTmdbId: number;
  selectedMovieTitle: string;
  ratingSettings?: ClubRatingSettings;
  defaultCollapsed?: boolean;
}

export function MovieMemberPanel({
  clubId,
  selectedTmdbId,
  selectedMovieTitle: _selectedMovieTitle,
  ratingSettings: _ratingSettings,
  defaultCollapsed = false,
}: MovieMemberPanelProps) {
  const [members, setMembers] = useState<MemberActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("name");
  const [search, setSearch] = useState("");
  const [showCount, setShowCount] = useState(PAGE_SIZE);
  const latestTmdbId = useRef(selectedTmdbId);

  // Fetch member activity when movie changes
  useEffect(() => {
    latestTmdbId.current = selectedTmdbId;
    setIsLoading(true);
    setShowCount(PAGE_SIZE);
    setSearch("");

    getMovieMemberActivity(clubId, selectedTmdbId).then((result) => {
      // Guard against stale responses
      if (latestTmdbId.current !== selectedTmdbId) return;
      if ("members" in result) {
        setMembers(result.members);
      } else if ("error" in result) {
        console.error("MovieMemberPanel error:", result.error);
        setMembers([]);
      }
      setIsLoading(false);
    });
  }, [clubId, selectedTmdbId]);

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    let list = members;

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.displayName.toLowerCase().includes(q));
    }

    // Filter
    switch (filter) {
      case "watched":
        list = list.filter((m) => m.hasWatched);
        break;
      case "not_watched":
        list = list.filter((m) => !m.hasWatched);
        break;
      case "rated":
        list = list.filter((m) => m.rating !== null);
        break;
    }

    // Sort
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "rating_desc":
          if (a.rating === null && b.rating === null) return 0;
          if (a.rating === null) return 1;
          if (b.rating === null) return -1;
          return b.rating - a.rating;
        case "watched_date":
          if (!a.watchedAt && !b.watchedAt) return 0;
          if (!a.watchedAt) return 1;
          if (!b.watchedAt) return -1;
          return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime();
        default:
          return a.displayName.localeCompare(b.displayName);
      }
    });

    return list;
  }, [members, filter, sort, search]);

  const visibleMembers = filteredMembers.slice(0, showCount);
  const hasMore = filteredMembers.length > showCount;

  // Stats
  const watchedCount = members.filter((m) => m.hasWatched).length;
  const ratedMembers = members.filter((m) => m.rating !== null);
  const avgRating =
    ratedMembers.length > 0
      ? ratedMembers.reduce((sum, m) => sum + m.rating!, 0) / ratedMembers.length
      : null;

  const toAvatarData = useCallback(
    (m: MemberActivity) =>
      userToAvatarData({
        display_name: m.displayName,
        avatar_url: m.avatarUrl,
        avatar_icon: m.avatarIcon,
        avatar_color_index: m.avatarColorIndex,
        avatar_border_color_index: m.avatarBorderColorIndex,
        email: m.email,
      }),
    []
  );

  return (
    <div
      className={cn(
        "rounded-xl bg-[var(--surface-1)] border border-[var(--border)] p-4 transition-opacity duration-300 will-change-[opacity]",
        isLoading ? "opacity-40" : "opacity-100"
      )}
    >
      {/* Header — clickable to toggle */}
      <button
        onClick={() => setIsCollapsed((c) => !c)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Users weight="bold" className="w-4 h-4" />
            Club Activity
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {watchedCount} of {members.length} watched
            {avgRating !== null && (
              <span className="ml-2">&middot; Avg rating: {formatRatingDisplay(avgRating)}</span>
            )}
          </p>
        </div>
        <CaretDown
          className={cn(
            "w-4 h-4 text-[var(--text-muted)] transition-transform",
            isCollapsed && "-rotate-90"
          )}
        />
      </button>

      {isCollapsed ? null : (
        <div className="space-y-4 mt-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex gap-1">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "watched", label: "Watched" },
                  { key: "not_watched", label: "Unwatched" },
                  { key: "rated", label: "Rated" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-colors",
                    filter === key
                      ? "bg-[var(--club-accent,var(--accent))] text-white font-medium"
                      : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="text-xs bg-[var(--surface-2)] text-[var(--text-muted)] border-none rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--club-accent,var(--accent))]"
            >
              <option value="name">Name</option>
              <option value="rating_desc">Rating</option>
              <option value="watched_date">Date Watched</option>
            </select>

            {/* Search */}
            <div className="relative ml-auto">
              <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs bg-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-none rounded-md pl-7 pr-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[var(--club-accent,var(--accent))]"
              />
            </div>
          </div>

          {/* Member list */}
          {filteredMembers.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">
              {search ? "No members match your search." : "No members match this filter."}
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {visibleMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <EntityAvatar entity={toAvatarData(member)} emojiSet="user" size="sm" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {member.displayName}
                    </p>
                    {member.watchedAt && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatRelativeDate(member.watchedAt)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Watch status */}
                    {member.hasWatched ? (
                      <Eye
                        weight="fill"
                        className="w-4 h-4 text-[var(--club-accent,var(--success))]"
                      />
                    ) : (
                      <EyeSlash className="w-4 h-4 text-[var(--text-muted)] opacity-40" />
                    )}

                    {/* Rating */}
                    {member.rating !== null ? (
                      <RatingDisplay rating={member.rating} />
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] opacity-40">&mdash;</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show more */}
          {hasMore && (
            <button
              onClick={() => setShowCount((c) => c + PAGE_SIZE)}
              className="w-full text-xs text-[var(--club-accent,var(--accent))] hover:underline py-1"
            >
              Show more ({filteredMembers.length - showCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
