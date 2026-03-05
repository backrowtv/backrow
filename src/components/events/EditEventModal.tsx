"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateEvent, type EventType, type ClubEvent } from "@/app/actions/events";
import {
  PencilSimple,
  CircleNotch,
  FilmStrip,
  FilmReel,
  Users,
  MapPin,
  Check,
} from "@phosphor-icons/react";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { MovieSearchInput } from "@/components/movies/MovieSearchInput";
import { MovieSearchResultItem } from "@/components/movies/MovieSearchResultItem";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";

interface SelectedMovie {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_url: string | null;
}

function toSelectedMovie(movie: TMDBMovieSearchResult): SelectedMovie {
  return {
    tmdb_id: movie.id,
    title: movie.title,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null,
  };
}

interface EditEventModalProps {
  event: ClubEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "watch_party", label: "Watch Party" },
  { value: "discussion", label: "Discussion" },
  { value: "meetup", label: "Meetup" },
  { value: "custom", label: "Custom Event" },
];

// Convert ISO date to datetime-local format
function toDateTimeLocal(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditEventModal({ event, open, onOpenChange }: EditEventModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Form state - initialized from event
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [eventType, setEventType] = useState<EventType>(event.event_type);
  const [eventDate, setEventDate] = useState(toDateTimeLocal(event.event_date));
  const [endDate, setEndDate] = useState(toDateTimeLocal(event.end_date));
  const [location, setLocation] = useState(event.location || "");
  const [maxAttendees, setMaxAttendees] = useState(event.max_attendees?.toString() || "");
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovie | null>(
    event.movie
      ? {
          tmdb_id: event.movie.tmdb_id,
          title: event.movie.title,
          year: null,
          poster_url: event.movie.poster_url,
        }
      : null
  );

  const { query, setQuery, results, isSearching, clear } = useMovieSearch({
    maxResults: 10,
  });

  // Reset form when event changes or modal opens
  useEffect(() => {
    if (open) {
      setTitle(event.title);
      setDescription(event.description || "");
      setEventType(event.event_type);
      setEventDate(toDateTimeLocal(event.event_date));
      setEndDate(toDateTimeLocal(event.end_date));
      setLocation(event.location || "");
      setMaxAttendees(event.max_attendees?.toString() || "");
      setSelectedMovie(
        event.movie
          ? {
              tmdb_id: event.movie.tmdb_id,
              title: event.movie.title,
              year: null,
              poster_url: event.movie.poster_url,
            }
          : null
      );
      clear();
      setError(null);
    }
  }, [open, event, clear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Event title is required");
      return;
    }
    if (!eventDate) {
      setError("Event date is required");
      return;
    }

    startTransition(async () => {
      const result = await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        event_date: new Date(eventDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        location: location.trim() || undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        tmdb_id: selectedMovie?.tmdb_id || undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[550px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilSimple className="h-5 w-5" />
            Edit Event
          </DialogTitle>
          <DialogDescription>Update the event details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Select
              id="eventType"
              label="Event Type"
              required
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Event Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Watch Party: The Godfather"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the event..."
              rows={3}
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-eventDate">Start Date & Time *</Label>
              <DateTimePicker
                value={eventDate}
                onChange={setEventDate}
                placeholder="Select start date & time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">End Date & Time</Label>
              <DateTimePicker
                value={endDate}
                onChange={setEndDate}
                minDateTime={eventDate}
                placeholder="Select end date & time"
              />
            </div>
          </div>

          {/* End date validation error */}
          {endDate && eventDate && new Date(endDate) <= new Date(eventDate) && (
            <p className="text-xs text-[var(--error)]">End date must be after start date</p>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="edit-location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Discord, Zoom link, or physical address"
            />
          </div>

          {/* Max Attendees */}
          <div className="space-y-2">
            <Label htmlFor="edit-maxAttendees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Max Attendees
            </Label>
            <Input
              id="edit-maxAttendees"
              type="number"
              min="1"
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
              placeholder="Leave empty for unlimited"
            />
          </div>

          {/* Movie Link (for watch parties) */}
          {(eventType === "watch_party" || eventType === "discussion") && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FilmStrip className="h-4 w-4" />
                Link a Movie
              </Label>

              {!selectedMovie && (
                <>
                  <MovieSearchInput
                    value={query}
                    onChange={(value) => setQuery(value)}
                    isSearching={isSearching}
                    placeholder="Search for a movie..."
                  />

                  {results.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {results.map((movie) => (
                        <MovieSearchResultItem
                          key={movie.id}
                          movie={movie}
                          onSelect={(m) => {
                            setSelectedMovie(toSelectedMovie(m));
                            clear();
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {!isSearching && query.length >= 2 && results.length === 0 && (
                    <div className="text-center py-4">
                      <FilmReel className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] opacity-50" />
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        No movies found for &quot;{query}&quot;
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedMovie && (
                <Card
                  style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--primary)" }}
                  className="border-2"
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="relative w-12 aspect-[2/3] rounded overflow-hidden flex-shrink-0">
                        {selectedMovie.poster_url ? (
                          <Image
                            src={
                              selectedMovie.poster_url.startsWith("http")
                                ? selectedMovie.poster_url
                                : `https://image.tmdb.org/t/p/w200${selectedMovie.poster_url}`
                            }
                            alt={selectedMovie.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                            placeholder="blur"
                            blurDataURL={getTMDBBlurDataURL()}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: "var(--surface-1)" }}
                          >
                            <FilmReel className="w-5 h-5 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3
                              className="font-semibold text-sm"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {selectedMovie.title}
                            </h3>
                            {selectedMovie.year && (
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {selectedMovie.year}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMovie(null)}
                            className="text-xs px-2 py-1 h-auto"
                          >
                            Change
                          </Button>
                        </div>
                        <div
                          className="flex items-center gap-1 mt-1"
                          style={{ color: "var(--primary)" }}
                        >
                          <Check className="w-3 h-3" />
                          <span className="text-xs font-medium">Selected</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-[var(--error)] bg-[var(--error)]/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim() || !eventDate}>
              {isPending ? (
                <>
                  <CircleNotch className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
