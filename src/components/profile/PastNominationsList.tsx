"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateDisplay } from "@/components/ui/date-display";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MagnifyingGlass, CaretUp, CaretDown, FilmReel } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { useResizableColumns } from "./hooks/useResizableColumns";
import type { PastNominationItem } from "@/app/actions/profile/past-nominations";

interface PastNominationsListProps {
  items: PastNominationItem[];
  onNavigateToMovie: (tmdbId: number) => void;
}

const sortOptions = [
  { value: "title", label: "Title", defaultDir: "asc" as const },
  { value: "date", label: "Date Added", defaultDir: "desc" as const },
  { value: "club", label: "Club", defaultDir: "asc" as const },
  { value: "theme", label: "Theme", defaultDir: "asc" as const },
] as const;

type SortField = (typeof sortOptions)[number]["value"];
type SortDirection = "asc" | "desc";

const resizableColumns = [
  { key: "title", minWidth: 120, defaultWidth: 240 },
  { key: "club", minWidth: 80, defaultWidth: 150 },
  { key: "theme", minWidth: 80, defaultWidth: 140 },
  { key: "date", minWidth: 80, defaultWidth: 110 },
];

function ResizeHandle({
  columnKey,
  onMouseDown,
}: {
  columnKey: string;
  onMouseDown: (key: string, e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Resize column"
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
      onMouseDown={(e) => onMouseDown(columnKey, e)}
    >
      <div className="absolute right-0 top-1 bottom-1 w-px bg-[var(--border)] opacity-40 group-hover:opacity-100 group-hover:w-0.5 transition-all" />
    </div>
  );
}

export function PastNominationsList({ items, onNavigateToMovie }: PastNominationsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { widths, onMouseDown } = useResizableColumns(resizableColumns);

  const handleSortChange = (value: SortField) => {
    if (sortBy === value) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      const option = sortOptions.find((o) => o.value === value);
      setSortBy(value);
      setSortDirection(option?.defaultDir || "asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const title = item.movie?.title?.toLowerCase() || "";
        const club = item.festival?.club?.name?.toLowerCase() || "";
        const theme = item.festival?.theme?.toLowerCase() || "";
        const pitch = item.pitch?.toLowerCase() || "";
        return (
          title.includes(query) ||
          club.includes(query) ||
          theme.includes(query) ||
          pitch.includes(query)
        );
      });
    }

    const dir = sortDirection === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (sortBy) {
        case "title": {
          return dir * (a.movie?.title || "").localeCompare(b.movie?.title || "");
        }
        case "date": {
          return (
            dir * (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
          );
        }
        case "club": {
          return dir * (a.festival?.club?.name || "").localeCompare(b.festival?.club?.name || "");
        }
        case "theme": {
          return dir * (a.festival?.theme || "").localeCompare(b.festival?.theme || "");
        }
        default:
          return 0;
      }
    });

    return result;
  }, [items, searchQuery, sortBy, sortDirection]);

  return (
    <div className="space-y-3">
      {/* Search + Sort bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
          <Input
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0">
              Sort: {sortOptions.find((o) => o.value === sortBy)?.label}
              {sortDirection === "asc" ? (
                <CaretUp className="w-3 h-3 opacity-50" />
              ) : (
                <CaretDown className="w-3 h-3 opacity-50" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sortOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={sortBy === option.value}
                onCheckedChange={() => handleSortChange(option.value)}
              >
                {option.label}
                {sortBy === option.value && (
                  <span className="ml-auto text-[var(--text-muted)]">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {filteredAndSorted.length} result{filteredAndSorted.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* List */}
      {filteredAndSorted.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          <FilmReel className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">
            {searchQuery ? "No movies match your search" : "No past nominations yet"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 52 }} />
              <col style={{ width: widths.title }} />
              <col className="hidden md:table-column" style={{ width: widths.club }} />
              <col className="hidden lg:table-column" style={{ width: widths.theme }} />
              <col className="hidden md:table-column" style={{ width: widths.date }} />
            </colgroup>

            {/* Header */}
            <thead>
              <tr
                className="hidden sm:table-row text-xs font-medium border-b border-[var(--border)]"
                style={{ color: "var(--text-muted)", background: "var(--surface-1)" }}
              >
                <th className="px-3 py-2 text-left font-medium">
                  <span className="sr-only">Poster</span>
                </th>
                <th className="px-3 py-2 text-left font-medium relative">
                  Title
                  <ResizeHandle columnKey="title" onMouseDown={onMouseDown} />
                </th>
                <th className="px-3 py-2 text-left font-medium relative hidden md:table-cell">
                  Club
                  <ResizeHandle columnKey="club" onMouseDown={onMouseDown} />
                </th>
                <th className="px-3 py-2 text-left font-medium relative hidden lg:table-cell">
                  Theme
                  <ResizeHandle columnKey="theme" onMouseDown={onMouseDown} />
                </th>
                <th className="px-3 py-2 text-left font-medium relative hidden md:table-cell">
                  Date
                  <ResizeHandle columnKey="date" onMouseDown={onMouseDown} />
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSorted.map((item) => {
                const movie = item.movie;
                const club = item.festival?.club;
                const posterUrl = movie?.poster_url
                  ? movie.poster_url.startsWith("http")
                    ? movie.poster_url
                    : `https://image.tmdb.org/t/p/w92${movie.poster_url}`
                  : null;

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[var(--border)] last:border-b-0",
                      "hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
                    )}
                    onClick={() => movie && onNavigateToMovie(movie.tmdb_id)}
                  >
                    {/* Poster */}
                    <td className="px-3 py-2 align-middle">
                      <div
                        className="w-10 h-[60px] rounded overflow-hidden shrink-0"
                        style={{ backgroundColor: "var(--surface-2)" }}
                      >
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={movie?.title || "Movie"}
                            width={40}
                            height={60}
                            className="object-cover w-full h-full"
                            placeholder="blur"
                            blurDataURL={getTMDBBlurDataURL()}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FilmReel className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title + year + pitch */}
                    <td className="px-2 sm:px-3 py-2 align-middle overflow-hidden">
                      <div className="min-w-0">
                        <div className="line-clamp-3">
                          <span
                            className="text-xs sm:text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {movie?.title || "Unknown"}
                          </span>
                          {movie?.year && (
                            <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>
                              ({movie.year})
                            </span>
                          )}
                        </div>
                        {item.pitch && (
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {item.pitch}
                          </p>
                        )}
                        {/* Mobile-only club/theme */}
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          {club && (
                            <div className="flex items-center gap-1">
                              <EntityAvatar entity={clubToAvatarData(club)} size="xs" />
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {club.name}
                              </span>
                            </div>
                          )}
                          {item.festival?.theme && (
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              · {item.festival.theme}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Club */}
                    <td className="px-3 py-2 align-middle overflow-hidden hidden md:table-cell">
                      {club ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <EntityAvatar entity={clubToAvatarData(club)} size="xs" />
                          <span
                            className="text-xs truncate"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {club.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* Theme */}
                    <td className="px-3 py-2 align-middle overflow-hidden hidden lg:table-cell">
                      {item.festival?.theme ? (
                        <span
                          className="text-xs truncate block"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {item.festival.theme}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 align-middle hidden md:table-cell">
                      {item.created_at && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <DateDisplay date={item.created_at} />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
