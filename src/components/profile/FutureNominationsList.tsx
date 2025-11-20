"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateDisplay } from "@/components/ui/date-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MagnifyingGlass,
  CaretUp,
  CaretDown,
  Link as LinkIcon,
  Trash,
  CircleNotch,
  FilmReel,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { useResizableColumns } from "./hooks/useResizableColumns";
import type { FutureNominationItem } from "./hooks";

interface FutureNominationsListProps {
  items: FutureNominationItem[];
  onDeleteClick: (itemId: string) => void;
  onManageLinks: (item: FutureNominationItem) => void;
  onNavigateToMovie: (tmdbId: number) => void;
  deletingId: string | null;
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
  { key: "club", minWidth: 80, defaultWidth: 140 },
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

export function FutureNominationsList({
  items,
  onDeleteClick,
  onManageLinks,
  onNavigateToMovie,
  deletingId,
}: FutureNominationsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { onMouseDown } = useResizableColumns(resizableColumns);

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
        const note = item.note?.toLowerCase() || "";
        const tags = item.tags?.join(" ").toLowerCase() || "";
        const club = item.primaryClubName?.toLowerCase() || "";
        const theme = item.primaryThemeName?.toLowerCase() || "";
        return (
          title.includes(query) ||
          note.includes(query) ||
          tags.includes(query) ||
          club.includes(query) ||
          theme.includes(query)
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
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        case "club": {
          return dir * (a.primaryClubName || "").localeCompare(b.primaryClubName || "");
        }
        case "theme": {
          return dir * (a.primaryThemeName || "").localeCompare(b.primaryThemeName || "");
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
            className="h-8 pl-8 text-xs"
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
            {searchQuery ? "No movies match your search" : "No future nominations yet"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 52 }} />
              <col />
              <col className="hidden md:table-column" style={{ width: 140 }} />
              <col className="hidden lg:table-column" style={{ width: 140 }} />
              <col className="hidden md:table-column" style={{ width: 110 }} />
              <col style={{ width: 56 }} />
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
                  Added
                  <ResizeHandle columnKey="date" onMouseDown={onMouseDown} />
                </th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSorted.map((item) => {
                const movie = item.movie;
                const isDeleting = deletingId === item.id;
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
                      "hover:bg-[var(--surface-1)] transition-colors cursor-pointer",
                      isDeleting && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => movie && onNavigateToMovie(movie.tmdb_id)}
                  >
                    {/* Poster */}
                    <td className="px-2 sm:px-3 py-2 align-middle">
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

                    {/* Title + year + note */}
                    <td className="px-2 sm:px-3 py-2 align-top overflow-hidden">
                      <div className="min-w-0">
                        <div className="line-clamp-3 leading-snug">
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
                        {item.note && (
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {item.note}
                          </p>
                        )}
                        {/* Mobile-only club/theme */}
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          {item.primaryClubName && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {item.primaryClubName}
                            </Badge>
                          )}
                          {item.primaryThemeName && (
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {item.primaryThemeName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Club */}
                    <td className="px-3 py-2 align-middle overflow-hidden hidden md:table-cell">
                      {item.primaryClubName ? (
                        <span
                          className="text-xs truncate block"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {item.primaryClubName}
                          {(item.clubCount || 0) > 1 && (
                            <span
                              className="ml-1 text-[10px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              +{(item.clubCount || 1) - 1}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* Theme */}
                    <td className="px-3 py-2 align-middle overflow-hidden hidden lg:table-cell">
                      {item.primaryThemeName ? (
                        <span
                          className="text-xs truncate block"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {item.primaryThemeName}
                          {(item.themeCount || 0) > 1 && (
                            <span
                              className="ml-1 text-[10px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              +{(item.themeCount || 1) - 1}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 align-middle hidden md:table-cell">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        <DateDisplay date={item.created_at} />
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="px-1 sm:px-2 py-2 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onManageLinks(item)}
                          aria-label="Manage theme links"
                        >
                          <LinkIcon
                            className="w-3.5 h-3.5"
                            style={{ color: "var(--text-muted)" }}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onDeleteClick(item.id)}
                          disabled={isDeleting}
                          aria-label="Delete"
                        >
                          {isDeleting ? (
                            <CircleNotch
                              className="w-3.5 h-3.5 animate-spin"
                              style={{ color: "var(--text-muted)" }}
                            />
                          ) : (
                            <Trash className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                          )}
                        </Button>
                      </div>
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
