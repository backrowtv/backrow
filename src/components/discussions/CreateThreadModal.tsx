"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createThread } from "@/app/actions/discussions";
import type { DiscussionTagType, TagInput } from "@/app/actions/discussions";
import {
  FilmReel,
  User,
  X,
  MagnifyingGlass,
  CircleNotch,
  Tag,
  MusicNote,
  Megaphone,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { MovieSearchResultItem } from "@/components/movies/MovieSearchResultItem";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic import for heavy rich text editor
const SimpleRichTextEditor = dynamic(
  () => import("@/components/movies/SimpleRichTextEditor").then((mod) => mod.SimpleRichTextEditor),
  {
    loading: () => <Skeleton className="h-[150px] rounded-lg border border-[var(--border)]" />,
    ssr: false,
  }
);

// Types for search results
interface PersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
}

interface FestivalSearchResult {
  id: string;
  theme: string;
  slug: string | null;
}

// Selected tag with display info
interface SelectedTag {
  tag_type: DiscussionTagType;
  // Entity identifiers
  tmdb_id?: number;
  person_tmdb_id?: number;
  festival_id?: string;
  // Display info
  display_name: string;
  image_url?: string | null;
}

interface CreateThreadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  clubSlug: string;
  // Optional pre-fill tags
  initialTags?: SelectedTag[];
}

// Tag type config for UI - using design system colors
const TAG_TYPE_CONFIG: Record<
  DiscussionTagType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  movie: {
    label: "Movie",
    icon: <FilmReel className="w-3 h-3" />,
    color: "bg-[var(--info)] text-white border-[var(--info)]",
  },
  actor: {
    label: "Actor",
    icon: <User className="w-3 h-3" />,
    color: "bg-[var(--accent)] text-white border-[var(--accent)]",
  },
  director: {
    label: "Director",
    icon: <Megaphone className="w-3 h-3" />,
    color: "bg-[var(--warning)] text-white border-[var(--warning)]",
  },
  composer: {
    label: "Composer",
    icon: <MusicNote className="w-3 h-3" />,
    color: "bg-[var(--success)] text-white border-[var(--success)]",
  },
  festival: {
    label: "Festival",
    icon: <CalendarBlank className="w-3 h-3" />,
    color: "bg-[var(--error)] text-white border-[var(--error)]",
  },
};

export function CreateThreadModal({
  open,
  onOpenChange,
  clubId,
  clubSlug,
  initialTags = [],
}: CreateThreadModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Selected tags
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(initialTags);

  // Current search mode
  const [searchMode, setSearchMode] = useState<DiscussionTagType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingOther, setIsSearchingOther] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  // Movie search via shared hook
  const movieSearch = useMovieSearch({
    maxResults: 8,
    enabled: searchMode === "movie",
  });

  // Search results for non-movie types
  const [personResults, setPersonResults] = useState<PersonSearchResult[]>([]);
  const [festivalResults, setFestivalResults] = useState<FestivalSearchResult[]>([]);

  // Existing discussions state
  interface ExistingThread {
    id: string;
    slug: string | null;
    title: string;
    author?: { display_name: string };
    comment_count: number;
  }
  const [_existingThreads, setExistingThreads] = useState<ExistingThread[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
      setIsSpoiler(false);
      setError(null);
      setSelectedTags(initialTags);
      setSearchMode(null);
      setSearchQuery("");
      movieSearch.clear();
      setPersonResults([]);
      setFestivalResults([]);
      setExistingThreads([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialTags is intentionally excluded to prevent infinite loops when default [] is passed
  }, [open]);

  // Search effect for non-movie types (people, festivals)
  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    if (!searchMode || searchMode === "movie" || searchQuery.trim().length < 2) {
      setPersonResults([]);
      setFestivalResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setIsSearchingOther(true);
      try {
        if (["actor", "director", "composer"].includes(searchMode)) {
          const response = await fetch(
            `/api/tmdb/search-people?q=${encodeURIComponent(searchQuery)}`
          );
          const data = await response.json();
          if (response.ok) {
            const departmentMap: Record<string, string[]> = {
              actor: ["Acting"],
              director: ["Directing"],
              composer: ["Sound", "Music"],
            };
            const validDepartments = departmentMap[searchMode];
            const filtered = (data.results || []).filter((p: PersonSearchResult) =>
              validDepartments.includes(p.known_for_department)
            );
            setPersonResults(filtered.slice(0, 8));
          }
        } else if (searchMode === "festival") {
          const response = await fetch(
            `/api/clubs/${clubId}/festivals?search=${encodeURIComponent(searchQuery)}`
          );
          const data = await response.json();
          if (response.ok) {
            setFestivalResults((data.festivals || []).slice(0, 8));
          }
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearchingOther(false);
      }
    }, 400);

    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, [searchQuery, searchMode, clubId]);

  // Clear results when search mode changes
  useEffect(() => {
    setSearchQuery("");
    movieSearch.clear();
    setPersonResults([]);
    setFestivalResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- movieSearch is a stable hook instance; including it would cause unnecessary re-runs
  }, [searchMode]);

  const addMovieTag = (movie: TMDBMovieSearchResult) => {
    // Check if already added
    if (selectedTags.some((t) => t.tag_type === "movie" && t.tmdb_id === movie.id)) {
      return;
    }
    setSelectedTags((prev) => [
      ...prev,
      {
        tag_type: "movie",
        tmdb_id: movie.id,
        display_name: `${movie.title}${movie.release_date ? ` (${new Date(movie.release_date).getFullYear()})` : ""}`,
        image_url: movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : null,
      },
    ]);
    movieSearch.clear();
    setSearchMode(null);
  };

  const addPersonTag = (person: PersonSearchResult, personType: DiscussionTagType) => {
    // Check if already added
    if (
      selectedTags.some(
        (t) =>
          ["actor", "director", "composer"].includes(t.tag_type) && t.person_tmdb_id === person.id
      )
    ) {
      return;
    }
    setSelectedTags((prev) => [
      ...prev,
      {
        tag_type: personType,
        person_tmdb_id: person.id,
        display_name: person.name,
        image_url: person.profile_path
          ? `https://image.tmdb.org/t/p/w92${person.profile_path}`
          : null,
      },
    ]);
    setSearchQuery("");
    setPersonResults([]);
    setSearchMode(null);
  };

  const addFestivalTag = (festival: FestivalSearchResult) => {
    // Check if already added
    if (selectedTags.some((t) => t.tag_type === "festival" && t.festival_id === festival.id)) {
      return;
    }
    setSelectedTags((prev) => [
      ...prev,
      {
        tag_type: "festival",
        festival_id: festival.id,
        display_name: festival.theme,
      },
    ]);
    setSearchQuery("");
    setFestivalResults([]);
    setSearchMode(null);
  };

  const removeTag = (index: number) => {
    setSelectedTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("clubId", clubId);
    formData.append("title", title.trim());
    formData.append("content", content.trim());
    formData.append("isSpoiler", isSpoiler.toString());

    // Convert selectedTags to TagInput format
    const tags: TagInput[] = selectedTags.map((tag) => ({
      tag_type: tag.tag_type,
      tmdb_id: tag.tmdb_id,
      person_tmdb_id: tag.person_tmdb_id,
      festival_id: tag.festival_id,
    }));
    formData.append("tags", JSON.stringify(tags));

    const result = await createThread(null, formData);

    if ("error" in result) {
      setError(result.error);
      setIsSubmitting(false);
    } else if ("success" in result && result.threadId) {
      router.push(`/club/${clubSlug}/discuss/${result.threadSlug || result.threadId}`);
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  // Strip HTML to check if content is empty
  const isContentEmpty = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  const isFormValid = () => {
    return title.trim().length > 0 && !isContentEmpty(content);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create a Post" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title - Always Required */}
        <Input
          ref={titleInputRef}
          label="Title"
          placeholder="Give your discussion a title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          showCharacterCount
          required
        />

        {/* Selected Tags Display */}
        {selectedTags.length > 0 && (
          <div className="space-y-2">
            <p className="block text-sm font-medium text-[var(--text-primary)]">Tagged Topics</p>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag, index) => {
                const config = TAG_TYPE_CONFIG[tag.tag_type];
                return (
                  <Badge
                    key={`${tag.tag_type}-${tag.tmdb_id || tag.person_tmdb_id || tag.festival_id}-${index}`}
                    variant="outline"
                    className={`${config.color} flex items-center gap-1.5 py-1 px-2 text-xs`}
                  >
                    {config.icon}
                    <span className="max-w-[150px] truncate">{tag.display_name}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="ml-1 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Tags Section */}
        <div className="space-y-2">
          <p className="block text-sm font-medium text-[var(--text-primary)]">
            <span className="flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              Add Tags <span className="text-[var(--text-muted)] font-normal">(optional)</span>
            </span>
          </p>

          {/* Tag Type Selector */}
          {!searchMode && (
            <div className="flex flex-wrap gap-2">
              {(
                Object.entries(TAG_TYPE_CONFIG) as [
                  DiscussionTagType,
                  (typeof TAG_TYPE_CONFIG)[DiscussionTagType],
                ][]
              ).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSearchMode(type)}
                  className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  {config.icon}
                  {config.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Input */}
          {searchMode && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={TAG_TYPE_CONFIG[searchMode].color}>
                  {TAG_TYPE_CONFIG[searchMode].icon}
                  <span className="ml-1">{TAG_TYPE_CONFIG[searchMode].label}</span>
                </Badge>
                <button
                  type="button"
                  onClick={() => setSearchMode(null)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchMode === "movie" ? movieSearch.query : searchQuery}
                  onChange={(e) => {
                    if (searchMode === "movie") {
                      movieSearch.setQuery(e.target.value);
                    } else {
                      setSearchQuery(e.target.value);
                    }
                  }}
                  placeholder={`Search for ${searchMode === "actor" ? "an actor" : `a ${searchMode}`}...`}
                  className="w-full h-9 pl-9 pr-3 rounded-md border text-base md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none search-input-debossed"
                />
                {(searchMode === "movie" ? movieSearch.isSearching : isSearchingOther) && (
                  <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
                )}
              </div>

              {/* Movie Results */}
              {searchMode === "movie" && movieSearch.results.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]">
                  {movieSearch.results.map((movie) => (
                    <MovieSearchResultItem
                      key={movie.id}
                      movie={movie}
                      onSelect={addMovieTag}
                      compact
                    />
                  ))}
                </div>
              )}

              {/* Person Results */}
              {["actor", "director", "composer"].includes(searchMode) &&
                personResults.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    {personResults.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => addPersonTag(person, searchMode as DiscussionTagType)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-[var(--surface-1)] transition-colors text-left border-b border-[var(--border)] last:border-b-0"
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[var(--surface-2)] flex-shrink-0">
                          {person.profile_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${person.profile_path}`}
                              alt={person.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                              placeholder="blur"
                              blurDataURL={getTMDBBlurDataURL()}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-3 h-3 text-[var(--text-muted)]" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-[var(--text-primary)] truncate">
                          {person.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

              {/* Festival Results */}
              {searchMode === "festival" && festivalResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]">
                  {festivalResults.map((festival) => (
                    <button
                      key={festival.id}
                      type="button"
                      onClick={() => addFestivalTag(festival)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-[var(--surface-1)] transition-colors text-left border-b border-[var(--border)] last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                        <CalendarBlank className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                      <span className="text-sm text-[var(--text-primary)] truncate">
                        {festival.theme}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {((searchMode === "movie" &&
                movieSearch.query.length >= 2 &&
                !movieSearch.isSearching &&
                movieSearch.results.length === 0) ||
                (searchMode !== "movie" &&
                  searchQuery.length >= 2 &&
                  !isSearchingOther &&
                  ((["actor", "director", "composer"].includes(searchMode!) &&
                    personResults.length === 0) ||
                    (searchMode === "festival" && festivalResults.length === 0)))) && (
                <p className="text-xs text-[var(--text-muted)] px-1">No results found</p>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative">
          <div className="space-y-2">
            <p className="block text-sm font-medium text-[var(--text-primary)]">Content</p>
            <SimpleRichTextEditor
              content={content}
              onChange={setContent}
              placeholder="What's on your mind?"
            />
          </div>
          <p
            className={`absolute left-0 top-full mt-1 text-sm text-[var(--error)] ${!error ? "invisible pointer-events-none" : ""}`}
          >
            {error}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!isFormValid()}>
            Post
          </Button>
        </div>
      </form>
    </Modal>
  );
}
