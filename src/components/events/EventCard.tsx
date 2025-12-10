"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateDisplay } from "@/components/ui/date-display";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RSVPButton } from "./RSVPButton";
import { EditEventModal } from "./EditEventModal";
import { cancelEvent, deleteEvent } from "@/app/actions/events";
import type { ClubEvent, RSVPStatus } from "@/app/actions/events";
import {
  CalendarBlank,
  MapPin,
  Users,
  FilmReel,
  ChatCircle,
  Confetti,
  Sparkle,
  X,
  Trash,
  PencilSimple,
  CalendarPlus,
  DotsThree,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import toast from "react-hot-toast";

interface EventCardProps {
  event: ClubEvent;
  clubSlug: string;
  userRsvpStatus?: RSVPStatus | null;
  compact?: boolean;
  className?: string;
  isAdmin?: boolean;
}

const eventTypeConfig = {
  watch_party: { label: "Watch Party", icon: FilmReel },
  discussion: { label: "Discussion", icon: ChatCircle },
  meetup: { label: "Meetup", icon: Confetti },
  custom: { label: "Event", icon: Sparkle },
};

const statusBadgeConfig = {
  upcoming: { label: "Upcoming", variant: "default" as const },
  ongoing: { label: "Happening Now", variant: "secondary" as const },
  completed: { label: "Completed", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "danger" as const },
};

export function EventCard({
  event,
  clubSlug: _clubSlug,
  userRsvpStatus,
  compact = false,
  className,
  isAdmin = false,
}: EventCardProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<"cancel" | "delete" | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDownloadingCalendar, setIsDownloadingCalendar] = useState(false);
  const router = useRouter();

  const typeConfig = eventTypeConfig[event.event_type];
  const TypeIcon = typeConfig.icon;
  const statusConfig = statusBadgeConfig[event.status];

  // Handle nested data (can be array or object from Supabase)
  const creator = Array.isArray(event.creator) ? event.creator[0] : event.creator;
  const movie = Array.isArray(event.movie) ? event.movie[0] : event.movie;

  const isActive = event.status === "upcoming" || event.status === "ongoing";
  const canEdit = isAdmin && event.status !== "cancelled"; // Can edit upcoming, ongoing, or completed
  const canCancel = isAdmin && isActive; // Can only cancel active events
  const canDelete = isAdmin; // Admins can delete any event

  async function handleConfirmAction() {
    if (!confirmAction) return;

    startTransition(async () => {
      if (confirmAction === "cancel") {
        await cancelEvent(event.id);
      } else if (confirmAction === "delete") {
        await deleteEvent(event.id);
      }
      router.refresh();
      setConfirmAction(null);
    });
  }

  async function handleDownloadCalendar() {
    setIsDownloadingCalendar(true);
    try {
      const response = await fetch(`/api/events/${event.id}/ics`);
      if (!response.ok) {
        throw new Error("Failed to download calendar event");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Calendar download error:", error);
      toast.error("Failed to download calendar event");
    } finally {
      setIsDownloadingCalendar(false);
    }
  }

  if (compact) {
    return (
      <Card
        className={cn(
          "group transition-all duration-200 hover:border-[var(--primary)]/30",
          !isActive && "opacity-60",
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Movie Poster or Event Type Icon */}
            {movie?.poster_url ? (
              <div className="relative w-8 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={`https://image.tmdb.org/t/p/w92${movie.poster_url}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="32px"
                  placeholder="blur"
                  blurDataURL={getTMDBBlurDataURL()}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--surface-3)]">
                <TypeIcon className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm truncate text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                    {event.title}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <CalendarBlank className="h-3 w-3" />
                    <DateDisplay date={event.event_date} format="datetime" />
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadCalendar}
                    disabled={isDownloadingCalendar}
                    title="Add to calendar"
                    className="h-8 w-8 p-0"
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                  {isActive && (
                    <RSVPButton
                      eventId={event.id}
                      currentStatus={userRsvpStatus || null}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="elevated"
      className={cn(
        "group overflow-hidden transition-all duration-200",
        "hover:border-[var(--primary)]/30",
        !isActive && "opacity-70",
        className
      )}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--surface-3)]">
            <TypeIcon className="h-6 w-6 text-[var(--text-muted)]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {typeConfig.label}
              </Badge>
              <Badge variant={statusConfig.variant} className="text-xs">
                {statusConfig.label}
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
              {event.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <CalendarBlank className="h-4 w-4" />
            <DateDisplay date={event.event_date} format="datetime" />
            {event.end_date && (
              <>
                <span>-</span>
                <DateDisplay date={event.end_date} format="time" />
              </>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {movie && (
            <div className="flex items-center gap-2.5">
              {movie.poster_url ? (
                <div className="relative w-8 aspect-[2/3] rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_url}`}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="32px"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                </div>
              ) : (
                <FilmReel className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
              )}
              <span className="text-sm text-[var(--text-muted)] truncate">{movie.title}</span>
            </div>
          )}

          {creator && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <EntityAvatar entity={userToAvatarData(creator)} emojiSet="user" size="tiny" />
              <span>by {creator.display_name || "Member"}</span>
            </div>
          )}
        </div>

        {/* RSVP Stats */}
        {event.rsvp_counts && (
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-4">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="text-[var(--success)]">{event.rsvp_counts.going} going</span>
            </span>
            {event.rsvp_counts.maybe > 0 && (
              <span className="text-[var(--warning)]">{event.rsvp_counts.maybe} maybe</span>
            )}
            {event.max_attendees && (
              <span className="ml-auto">
                {event.rsvp_counts.going}/{event.max_attendees} spots
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          {/* Add to Calendar */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCalendar}
                  disabled={isDownloadingCalendar}
                  className="h-8 w-8 p-0"
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to Calendar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Admin Actions Dropdown */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <DotsThree className="h-4 w-4" weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setShowEditModal(true)} disabled={isPending}>
                    <PencilSimple className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canCancel && (
                  <DropdownMenuItem
                    onClick={() => setConfirmAction("cancel")}
                    disabled={isPending}
                    className="text-[var(--warning)] focus:text-[var(--warning)]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Event
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => setConfirmAction("delete")}
                    disabled={isPending}
                    className="text-[var(--error)] focus:text-[var(--error)]"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Event
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* RSVP Button */}
          {isActive && <RSVPButton eventId={event.id} currentStatus={userRsvpStatus || null} />}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction === "cancel" ? "Cancel Event?" : "Delete Event?"}
        description={
          confirmAction === "cancel"
            ? `Are you sure you want to cancel "${event.title}"? Members who RSVP'd will be notified.`
            : `Are you sure you want to permanently delete "${event.title}"? This action cannot be undone.`
        }
        confirmText={confirmAction === "cancel" ? "Cancel Event" : "Delete Event"}
        onConfirm={handleConfirmAction}
        variant="danger"
        isLoading={isPending}
      />

      {/* Edit Event Modal */}
      <EditEventModal event={event} open={showEditModal} onOpenChange={setShowEditModal} />
    </Card>
  );
}
