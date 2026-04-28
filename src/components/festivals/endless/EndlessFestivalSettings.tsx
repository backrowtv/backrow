"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useClubPreference } from "@/lib/hooks/useClubPreferences";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play,
  Star,
  FilmReel,
  Plus,
  MagnifyingGlass,
  Trash,
  Clock,
  Check,
  X,
  CaretDown,
  CaretUp,
  CaretLeft,
  CaretRight,
  CircleNotch,
  TextT,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { isBackRowFeaturedClub } from "@/lib/clubs/backrow-featured";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  getEndlessFestivalData,
  addMovieToPlaying,
  moveToCompleted,
  deleteFromEndlessFestival,
  updateEndlessFestivalName,
  type EndlessMovie,
  type DisplaySlot,
} from "@/app/actions/endless-festival";
import { updateClubSettings } from "@/app/actions/clubs";
import { searchMovies } from "@/app/actions/tmdb";
import Link from "next/link";
import { MoviePool } from "../movies/MoviePool";

interface EndlessFestivalSettingsProps {
  festivalId: string;
  currentTheme: string | null;
  clubSlug: string;
  clubId?: string;
  themePoolEnabled?: boolean;
  showTitleEnabled?: boolean;
  festivalLink: string;
  phaseLabel: string;
  startDate: string;
  nominationCount: number;
  memberCount: number;
  participantProgress: { complete: number; incomplete: number };
  phase: string;
}

export function EndlessFestivalSettings({
  festivalId,
  currentTheme,
  clubSlug,
  clubId,
  themePoolEnabled = true,
  showTitleEnabled = true,
  festivalLink,
  phaseLabel,
  startDate,
  nominationCount,
  memberCount,
  participantProgress,
  phase,
}: EndlessFestivalSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [nowPlaying, setNowPlaying] = useState<EndlessMovie[]>([]);
  const [pool, setPool] = useState<EndlessMovie[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<EndlessMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useClubPreference(
    clubId || "",
    "nowShowingExpanded",
    true
  );
  const [nowPlayingPage, setNowPlayingPage] = useState(0);
  const [showRecentlyPlayed, setShowRecentlyPlayed] = useState(false);
  const [showTitleSettings, setShowTitleSettings] = useState(false);

  // Festival title settings
  const [festivalTitle, setFestivalTitle] = useState(currentTheme || "");
  const [showTitle, setShowTitle] = useState(showTitleEnabled);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<{
    id: number;
    title: string;
    year: number | null;
    poster_path: string | null;
  } | null>(null);
  const [curatorNote, setCuratorNote] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<DisplaySlot>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Re-fetch all endless festival data (used on mount and after pool/playing mutations)
  const reloadFestivalData = useCallback(async () => {
    if (!clubId) return;
    const result = await getEndlessFestivalData(clubId);
    if (!("error" in result)) {
      setNowPlaying(result.nowPlaying);
      setPool(result.pool);
      setRecentlyPlayed(result.recentlyPlayed);
    }
  }, [clubId]);

  // Fetch endless festival data on mount
  useEffect(() => {
    if (!clubId) return;
    setIsLoading(true);
    reloadFestivalData().finally(() => setIsLoading(false));
  }, [clubId, reloadFestivalData]);

  // Reset pagination when nowPlaying changes
  useEffect(() => {
    setNowPlayingPage(0);
  }, [nowPlaying.length]);

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMovies(searchQuery);
      if (results && !("error" in results)) {
        setSearchResults(results.slice(0, 10));
      }
      setIsSearching(false);
    }, 300);

    searchTimeoutRef.current = timeout;

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  const handleAddMovie = async () => {
    if (!selectedMovie || !clubId) return;

    startTransition(async () => {
      const result = await addMovieToPlaying(
        clubId,
        selectedMovie.id,
        curatorNote || undefined,
        selectedSlot
      );

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${selectedMovie.title} is now playing!`);
        setShowAddModal(false);
        setSelectedMovie(null);
        setSearchQuery("");
        setCuratorNote("");
        setSelectedSlot(null);
        setSearchResults([]);

        // Refresh data
        const data = await getEndlessFestivalData(clubId);
        if (!("error" in data)) {
          setNowPlaying(data.nowPlaying);
          setPool(data.pool);
        }
        router.refresh();
      }
    });
  };

  const handleMoveToCompleted = async (movie: EndlessMovie) => {
    startTransition(async () => {
      const result = await moveToCompleted(movie.id);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${movie.title} moved to recently played`);
        // Update local state
        setNowPlaying((prev) => prev.filter((m) => m.id !== movie.id));
        setRecentlyPlayed((prev) => [{ ...movie, endless_status: "completed" }, ...prev]);
        router.refresh();
      }
    });
  };

  const handleDelete = async (movie: EndlessMovie, fromList: "playing" | "completed") => {
    if (!confirm(`Delete "${movie.title}" from the club? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteFromEndlessFestival(movie.id);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${movie.title} removed from club`);
        // Update local state
        if (fromList === "playing") {
          setNowPlaying((prev) => prev.filter((m) => m.id !== movie.id));
        } else {
          setRecentlyPlayed((prev) => prev.filter((m) => m.id !== movie.id));
        }
        router.refresh();
      }
    });
  };

  // Handle saving festival title settings
  const handleSaveTitleSettings = async () => {
    if (!clubId) return;

    setIsSavingTitle(true);
    try {
      // Update festival name (theme field)
      const nameResult = await updateEndlessFestivalName(festivalId, festivalTitle);
      if ("error" in nameResult) {
        toast.error(nameResult.error);
        setIsSavingTitle(false);
        return;
      }

      // Update show title setting in club settings
      const settingsResult = await updateClubSettings(clubId, {
        endless_festival_show_title: showTitle,
      });
      if ("error" in settingsResult) {
        toast.error(settingsResult.error || "Failed to save settings");
        setIsSavingTitle(false);
        return;
      }

      toast.success("Title settings saved");
      router.refresh();
    } finally {
      setIsSavingTitle(false);
    }
  };

  if (isLoading) {
    return (
      <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
        <CardContent className="p-6 flex items-center justify-center">
          <CircleNotch className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
        {/* Section A: Festival Overview */}
        <Link href={festivalLink} className="block group">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                  {phaseLabel}
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors truncate">
                  {currentTheme || "Endless Festival"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                <span suppressHydrationWarning>
                  Started{" "}
                  {new Date(startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <FilmReel className="w-3 h-3" />
                  {nominationCount} movie{nominationCount !== 1 ? "s" : ""}
                </span>
                {phase === "watch_rate" && (
                  <span>
                    {participantProgress.complete}/{memberCount} finished
                  </span>
                )}
              </div>
            </div>
            <CaretRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0" />
          </div>
        </Link>

        {/* Section B: Festival Title (collapsible) */}
        <div className="border-t border-[var(--border)]">
          <button
            onClick={() => setShowTitleSettings(!showTitleSettings)}
            className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <TextT className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              Festival Title
            </span>
            {showTitleSettings ? (
              <CaretDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            ) : (
              <CaretRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            )}
          </button>
          {showTitleSettings && (
            <div className="px-4 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-title" className="text-sm">
                    Show title on festival page
                  </Label>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Display a header above the &quot;Now Showing&quot; section
                  </p>
                </div>
                <Switch id="show-title" checked={showTitle} onCheckedChange={setShowTitle} />
              </div>
              <div className="flex items-center gap-2 h-8">
                <Input
                  id="festival-title"
                  value={festivalTitle}
                  onChange={(e) => setFestivalTitle(e.target.value)}
                  placeholder="Now Showing"
                  className={cn("flex-1 h-8", !showTitle && "invisible pointer-events-none")}
                />
                <Button
                  onClick={handleSaveTitleSettings}
                  disabled={isSavingTitle}
                  isLoading={isSavingTitle}
                  size="sm"
                  className="ml-auto flex-shrink-0"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Section C: Now Showing (collapsible) */}
        <div className="border-t border-[var(--border)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <button
              onClick={() => setShowNowPlaying(!showNowPlaying)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Play className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              Now Showing
              <Badge variant="default" size="sm">
                {nowPlaying.length}
              </Badge>
              {showNowPlaying ? (
                <CaretDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              ) : (
                <CaretRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              )}
            </button>
            <Button variant="club-accent" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Movie
            </Button>
          </div>
          {showNowPlaying && (
            <div className="px-4 pb-3">
              {nowPlaying.length === 0 ? (
                <EmptyState
                  icon={FilmReel}
                  title="Add a movie to start your endless festival"
                  variant="compact"
                />
              ) : (
                <>
                  <div className="divide-y divide-[var(--border)] rounded-lg overflow-hidden">
                    {nowPlaying.slice(nowPlayingPage * 5, nowPlayingPage * 5 + 5).map((movie) => (
                      <div
                        key={movie.id}
                        className="flex items-center gap-2 p-2"
                        style={{
                          backgroundColor: "var(--surface-2)",
                          ...(movie.display_slot
                            ? { boxShadow: "inset 2px 0 0 var(--primary)" }
                            : {}),
                        }}
                      >
                        <div className="relative w-8 h-12 rounded overflow-hidden bg-[var(--surface-3)] flex-shrink-0">
                          {movie.poster_url ? (
                            <Image
                              src={movie.poster_url}
                              alt={movie.title}
                              fill
                              className="object-cover"
                              sizes="32px"
                              placeholder="blur"
                              blurDataURL={getTMDBBlurDataURL()}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FilmReel
                                className="w-3 h-3"
                                style={{ color: "var(--text-muted)" }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {movie.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {movie.year || "Unknown year"}
                            </span>
                            {movie.display_slot && isBackRowFeaturedClub(clubSlug) && (
                              <Badge variant="primary" size="sm">
                                {movie.display_slot === "featured" ? "New Release" : "Throwback"}
                              </Badge>
                            )}
                          </div>
                          {movie.curator_note && (
                            <p
                              className="text-xs line-clamp-1"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {movie.curator_note}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleMoveToCompleted(movie)}
                            disabled={isPending}
                            className="p-1.5 rounded hover:bg-[var(--success)]/10 transition-colors text-[var(--success)]"
                            title="Move to Recently Played"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(movie, "playing")}
                            disabled={isPending}
                            className="p-1.5 rounded hover:bg-[var(--error)]/10 transition-colors text-[var(--error)]"
                            title="Delete from club"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {nowPlaying.length > 5 && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      <button
                        onClick={() => setNowPlayingPage((p) => Math.max(0, p - 1))}
                        disabled={nowPlayingPage === 0}
                        className="p-1 rounded hover:bg-[var(--surface-2)] transition-colors disabled:opacity-30"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <CaretLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {nowPlayingPage + 1} / {Math.ceil(nowPlaying.length / 5)}
                      </span>
                      <button
                        onClick={() =>
                          setNowPlayingPage((p) =>
                            Math.min(Math.ceil(nowPlaying.length / 5) - 1, p + 1)
                          )
                        }
                        disabled={nowPlayingPage >= Math.ceil(nowPlaying.length / 5) - 1}
                        className="p-1 rounded hover:bg-[var(--surface-2)] transition-colors disabled:opacity-30"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <CaretRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Section D: Recently Played (collapsible) */}
        {recentlyPlayed.length > 0 && (
          <div className="border-t border-[var(--border)]">
            <button
              onClick={() => setShowRecentlyPlayed(!showRecentlyPlayed)}
              className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                Recently Played
                <Badge variant="secondary" size="sm">
                  {recentlyPlayed.length}
                </Badge>
              </span>
              {showRecentlyPlayed ? (
                <CaretUp className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              ) : (
                <CaretDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              )}
            </button>
            {showRecentlyPlayed && (
              <div className="px-4 pb-3 space-y-2">
                {recentlyPlayed.slice(0, 10).map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-center gap-3 p-2 rounded-lg"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <div className="relative w-8 h-12 rounded overflow-hidden bg-[var(--surface-3)] flex-shrink-0">
                      {movie.poster_url ? (
                        <Image
                          src={movie.poster_url}
                          alt={movie.title}
                          fill
                          className="object-cover"
                          sizes="32px"
                          placeholder="blur"
                          blurDataURL={getTMDBBlurDataURL()}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FilmReel className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {movie.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {movie.year || "Unknown year"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(movie, "completed")}
                      disabled={isPending}
                      className="p-1.5 rounded hover:bg-[var(--error)]/10 transition-colors text-[var(--error)] flex-shrink-0 opacity-60 hover:opacity-100"
                      title="Delete from club"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Movie Pool - only show when theme pool is disabled */}
      {!themePoolEnabled && clubId && (
        <MoviePool
          movies={pool}
          clubId={clubId}
          canManage={true}
          votingEnabled={true}
          instanceId="settings"
          onPoolChanged={reloadFestivalData}
        />
      )}

      {/* Add Movie Modal */}
      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="Add Movie to Now Playing"
        description="Search for a movie to start playing"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <Input
              ref={searchInputRef as React.Ref<HTMLInputElement>}
              type="text"
              placeholder="Search for a movie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 search-input-debossed"
            />
          </div>

          {/* Selected movie preview */}
          {selectedMovie && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--primary)",
              }}
            >
              <div className="relative w-12 h-18 rounded overflow-hidden bg-[var(--surface-3)] flex-shrink-0">
                {selectedMovie.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`}
                    alt={selectedMovie.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmReel className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {selectedMovie.title}
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {selectedMovie.year || "Unknown year"}
                </p>
              </div>
              <button
                onClick={() => setSelectedMovie(null)}
                className="p-1 rounded hover:bg-[var(--surface-3)]"
              >
                <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          )}

          {/* Search results */}
          {!selectedMovie && searchQuery.length >= 2 && (
            <div
              className="max-h-[200px] overflow-y-auto rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            >
              {isSearching ? (
                <div className="p-4 text-center">
                  <CircleNotch
                    className="w-5 h-5 animate-spin mx-auto"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No results found
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {searchResults.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => setSelectedMovie(movie)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-[var(--surface-2)] transition-colors text-left"
                    >
                      <div className="relative w-8 h-12 rounded overflow-hidden bg-[var(--surface-2)] flex-shrink-0">
                        {movie.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            sizes="32px"
                            placeholder="blur"
                            blurDataURL={getTMDBBlurDataURL()}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FilmReel className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {movie.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {movie.year || "Unknown year"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Options when movie is selected */}
          {selectedMovie && (
            <>
              {/* Curator note */}
              <div>
                <label
                  htmlFor="endless-curator-note"
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Curator Note (optional)
                </label>
                <Input
                  id="endless-curator-note"
                  type="text"
                  placeholder="Why should we watch this?"
                  value={curatorNote}
                  onChange={(e) => setCuratorNote(e.target.value)}
                />
              </div>

              {/* Display slot selection */}
              <div>
                <p
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Homepage Display (optional)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSlot(selectedSlot === "featured" ? null : "featured")}
                    className={cn(
                      "flex-1 p-3 rounded-lg border text-center transition-colors",
                      selectedSlot === "featured"
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                    )}
                  >
                    <Star
                      className={cn(
                        "w-5 h-5 mx-auto mb-1",
                        selectedSlot === "featured"
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-muted)]"
                      )}
                    />
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      Featured
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      New releases
                    </p>
                  </button>
                  <button
                    onClick={() =>
                      setSelectedSlot(selectedSlot === "throwback" ? null : "throwback")
                    }
                    className={cn(
                      "flex-1 p-3 rounded-lg border text-center transition-colors",
                      selectedSlot === "throwback"
                        ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                        : "border-[var(--border)] hover:border-[var(--secondary)]/50"
                    )}
                  >
                    <Clock
                      className={cn(
                        "w-5 h-5 mx-auto mb-1",
                        selectedSlot === "throwback"
                          ? "text-[var(--secondary)]"
                          : "text-[var(--text-muted)]"
                      )}
                    />
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      Throwback
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Classic films
                    </p>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setSelectedMovie(null);
                setSearchQuery("");
                setCuratorNote("");
                setSelectedSlot(null);
                setSearchResults([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMovie}
              disabled={!selectedMovie || isPending}
              isLoading={isPending}
            >
              <Play className="w-4 h-4 mr-1" />
              Start Playing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
