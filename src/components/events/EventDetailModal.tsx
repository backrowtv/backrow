"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateDisplay } from "@/components/ui/date-display";
import { Spinner } from "@/components/ui/spinner";
import { EditEventModal } from "./EditEventModal";
import { getEventAttendees, type ClubEvent, type EventAttendee } from "@/app/actions/events";
import {
  CalendarBlank,
  MapPin,
  FilmReel,
  ChatCircle,
  Confetti,
  Sparkle,
  Users,
  CheckCircle,
  Question,
  XCircle,
  PencilSimple,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

interface EventDetailModalProps {
  event: ClubEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

const eventTypeConfig = {
  watch_party: {
    label: "Watch Party",
    icon: FilmReel,
    color: "text-[var(--text-muted)]",
    bgColor: "bg-[var(--surface-2)]",
  },
  discussion: {
    label: "Discussion",
    icon: ChatCircle,
    color: "text-[var(--info)]",
    bgColor: "bg-[var(--info)]/10",
  },
  meetup: {
    label: "Meetup",
    icon: Confetti,
    color: "text-[var(--success)]",
    bgColor: "bg-[var(--success)]/10",
  },
  custom: {
    label: "Event",
    icon: Sparkle,
    color: "text-[var(--accent)]",
    bgColor: "bg-[var(--accent)]/10",
  },
};

const statusBadgeConfig = {
  upcoming: { label: "Upcoming", variant: "default" as const },
  ongoing: { label: "Happening Now", variant: "secondary" as const },
  completed: { label: "Completed", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "danger" as const },
};

export function EventDetailModal({
  event,
  open,
  onOpenChange,
  isAdmin = false,
}: EventDetailModalProps) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [isPending, startTransition] = useTransition();
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (open && event) {
      startTransition(async () => {
        const result = await getEventAttendees(event.id);
        if (result.data) {
          setAttendees(result.data);
        }
      });
    } else {
      setAttendees([]);
    }
  }, [open, event]);

  if (!event) return null;

  const typeConfig = eventTypeConfig[event.event_type];
  const TypeIcon = typeConfig.icon;
  const statusConfig = statusBadgeConfig[event.status];

  // Handle nested data
  const creator = Array.isArray(event.creator) ? event.creator[0] : event.creator;
  const movie = Array.isArray(event.movie) ? event.movie[0] : event.movie;

  const goingAttendees = attendees.filter((a) => a.status === "going");
  const maybeAttendees = attendees.filter((a) => a.status === "maybe");
  const notGoingAttendees = attendees.filter((a) => a.status === "not_going");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={event.title}
      description={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={typeConfig.color}>
            <TypeIcon className="h-3 w-3 mr-1" />
            {typeConfig.label}
          </Badge>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      }
      size="lg"
    >
      <div className="space-y-5">
        {/* Linked Movie */}
        {movie && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)]">
            {movie.poster_url ? (
              <div className="relative w-12 aspect-[2/3] rounded overflow-hidden flex-shrink-0">
                <Image
                  src={`https://image.tmdb.org/t/p/w200${movie.poster_url}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="48px"
                  placeholder="blur"
                  blurDataURL={getTMDBBlurDataURL()}
                />
              </div>
            ) : (
              <div className="w-12 aspect-[2/3] rounded flex items-center justify-center bg-[var(--surface-3)] flex-shrink-0">
                <FilmReel className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{movie.title}</p>
              <p className="text-xs text-[var(--text-muted)]">Linked movie</p>
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="space-y-3">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <CalendarBlank className={cn("h-4 w-4 mt-0.5", typeConfig.color)} />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                <DateDisplay date={event.event_date} format="datetime" />
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                <DateDisplay date={event.event_date} format="time" />
                {event.end_date && (
                  <>
                    {" "}
                    - <DateDisplay date={event.end_date} format="time" />
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm text-[var(--text-primary)]">{event.location}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-2">
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Creator */}
        {creator && (
          <div className="flex items-center gap-2 py-3 border-t border-[var(--border)]">
            <EntityAvatar entity={userToAvatarData(creator)} emojiSet="user" size="sm" />
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Organized by </span>
              <span className="font-medium text-[var(--text-primary)]">
                {creator.display_name || "Member"}
              </span>
            </div>
          </div>
        )}

        {/* Attendees Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <Users className="h-4 w-4" />
            Attendees ({attendees.length})
          </div>

          {isPending ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : attendees.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
              No RSVPs for this event
            </p>
          ) : (
            <div className="space-y-4">
              {/* Going */}
              {goingAttendees.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                    <CheckCircle className="h-4 w-4" weight="fill" />
                    <span>Going ({goingAttendees.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {goingAttendees.map((attendee) => (
                      <div
                        key={attendee.user_id}
                        className="flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20"
                      >
                        <EntityAvatar
                          entity={userToAvatarData(attendee.user)}
                          emojiSet="user"
                          size="tiny"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">
                          {attendee.user.display_name || attendee.user.username || "Member"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maybe */}
              {maybeAttendees.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--warning)]">
                    <Question className="h-4 w-4" weight="fill" />
                    <span>Maybe ({maybeAttendees.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {maybeAttendees.map((attendee) => (
                      <div
                        key={attendee.user_id}
                        className="flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/20"
                      >
                        <EntityAvatar
                          entity={userToAvatarData(attendee.user)}
                          emojiSet="user"
                          size="tiny"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">
                          {attendee.user.display_name || attendee.user.username || "Member"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not Going */}
              {notGoingAttendees.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--error)]">
                    <XCircle className="h-4 w-4" weight="fill" />
                    <span>Not Going ({notGoingAttendees.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {notGoingAttendees.map((attendee) => (
                      <div
                        key={attendee.user_id}
                        className="flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--error)]/10 border border-[var(--error)]/20"
                      >
                        <EntityAvatar
                          entity={userToAvatarData(attendee.user)}
                          emojiSet="user"
                          size="tiny"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">
                          {attendee.user.display_name || attendee.user.username || "Member"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Capacity Info */}
        {event.max_attendees && (
          <div className="pt-3 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)]">
              {goingAttendees.length}/{event.max_attendees} spots filled
            </p>
          </div>
        )}

        {/* Admin Actions */}
        {isAdmin && event.status !== "cancelled" && (
          <div className="pt-3 border-t border-[var(--border)]">
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
              <PencilSimple className="h-4 w-4 mr-2" />
              Edit Event
            </Button>
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      {event && (
        <EditEventModal event={event} open={showEditModal} onOpenChange={setShowEditModal} />
      )}
    </Modal>
  );
}
