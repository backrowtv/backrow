"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { cn } from "@/lib/utils";
import { CaretUp, CaretDown, CaretUpDown, Check } from "@phosphor-icons/react";
import NumberFlow from "@/components/ui/number-flow";

type SortField = "name" | "members" | "festivals" | "movies";
type SortDirection = "asc" | "desc";

interface ClubData {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  picture_url?: string | null;
  member_count?: number;
  festival_count?: number;
  movies_watched?: number;
  is_favorite?: boolean;
  is_member?: boolean;
  user_role?: string;
  theme_color?: string | null;
  privacy?: string | null;
  settings?: unknown;
}

interface ClubsTableProps {
  clubs: ClubData[];
  className?: string;
}

export function ClubsTable({ clubs, className }: ClubsTableProps) {
  const [sortField, setSortField] = useState<SortField>("members");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedClubs = useMemo(() => {
    return [...clubs].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "members":
          comparison = (a.member_count || 0) - (b.member_count || 0);
          break;
        case "festivals":
          comparison = (a.festival_count || 0) - (b.festival_count || 0);
          break;
        case "movies":
          comparison = (a.movies_watched || 0) - (b.movies_watched || 0);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [clubs, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <CaretUpDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
    }
    return sortDirection === "asc" ? (
      <CaretUp className="w-3.5 h-3.5 text-[var(--text-primary)]" />
    ) : (
      <CaretDown className="w-3.5 h-3.5 text-[var(--text-primary)]" />
    );
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 px-3">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors"
              >
                Club
                <SortIcon field="name" />
              </button>
            </th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">
              <button
                onClick={() => handleSort("members")}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors"
              >
                Members
                <SortIcon field="members" />
              </button>
            </th>
            <th className="text-left py-2 px-3 hidden md:table-cell">
              <button
                onClick={() => handleSort("festivals")}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors"
              >
                Festivals
                <SortIcon field="festivals" />
              </button>
            </th>
            <th className="text-left py-2 px-3 hidden lg:table-cell">
              <button
                onClick={() => handleSort("movies")}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors"
              >
                Movies
                <SortIcon field="movies" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedClubs.map((club) => (
            <tr key={club.id} className={cn("transition-colors", "hover:bg-[var(--surface-1)]")}>
              <td className="py-2.5 px-3">
                <Link href={`/club/${club.slug}`} className="flex items-center gap-3">
                  <EntityAvatar
                    entity={clubToAvatarData(club)}
                    emojiSet="club"
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {club.name}
                      </span>
                      {club.is_member && (
                        <Check
                          className="w-4 h-4 text-[var(--primary)] flex-shrink-0"
                          weight="bold"
                        />
                      )}
                    </div>
                    {/* Mobile-only: show members inline */}
                    <div className="sm:hidden text-xs text-[var(--text-muted)] mt-0.5">
                      <NumberFlow value={club.member_count || 0} /> members
                    </div>
                  </div>
                </Link>
              </td>
              <td className="py-3 px-3 hidden sm:table-cell">
                <span className="text-[13px] tabular-nums text-[var(--text-secondary)]">
                  <NumberFlow value={club.member_count || 0} />
                </span>
              </td>
              <td className="py-3 px-3 hidden md:table-cell">
                <span className="text-[13px] tabular-nums text-[var(--text-secondary)]">
                  <NumberFlow value={club.festival_count || 0} />
                </span>
              </td>
              <td className="py-3 px-3 hidden lg:table-cell">
                <span className="text-[13px] tabular-nums text-[var(--text-secondary)]">
                  <NumberFlow value={club.movies_watched || 0} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
