"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Badge } from "@/components/ui/badge";
import { DateDisplay } from "@/components/ui/date-display";
import { EventDetailModal } from "./EventDetailModal";
import type { ClubEvent } from "@/app/actions/events";
import {
  CalendarBlank,
  FilmReel,
  ChatCircle,
  Confetti,
  Sparkle,
  Users,
  MapPin,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PastEventsListProps {
  events: ClubEvent[];
  emptyMessage?: string;
  className?: string;
  isAdmin?: boolean;
}

const eventTypeConfig = {
  watch_party: { label: "Watch Party", icon: FilmReel },
  discussion: { label: "Discussion", icon: ChatCircle },
  meetup: { label: "Meetup", icon: Confetti },
  custom: { label: "Event", icon: Sparkle },
};

export function PastEventsList({
  events,
  emptyMessage = "No past events",
  className,
  isAdmin = false,
}: PastEventsListProps) {
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);

  if (events.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-8 text-center">
          <CalendarBlank className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
          <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={cn("grid gap-3 md:grid-cols-2", className)}>
        {events.map((event) => {
          const typeConfig = eventTypeConfig[event.event_type];
          const TypeIcon = typeConfig.icon;
          const _movie = Array.isArray(event.movie) ? event.movie[0] : event.movie;
          const creator = Array.isArray(event.creator) ? event.creator[0] : event.creator;
          const attendeeCount = event.rsvp_counts?.going || 0;

          return (
            <Card
              key={event.id}
              variant="elevated"
              className="group cursor-pointer transition-all duration-200 hover:border-[var(--primary)]/30 overflow-hidden"
              onClick={() => setSelectedEvent(event)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--surface-3)]">
                    <TypeIcon className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {typeConfig.label}
                      </Badge>
                      {event.status === "cancelled" && (
                        <Badge variant="danger" className="text-[10px]">
                          Cancelled
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                      {event.title}
                    </h4>
                  </div>
                </div>

                {/* Date & Location */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <CalendarBlank className="h-3 w-3" />
                    <DateDisplay date={event.event_date} format="datetime" />
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    {creator && (
                      <>
                        <EntityAvatar
                          entity={userToAvatarData(creator)}
                          emojiSet="user"
                          size="tiny"
                        />
                        <span className="truncate max-w-[80px]">
                          {creator.display_name || "Member"}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Users className="h-3 w-3" />
                    <span>{attendeeCount} attended</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        isAdmin={isAdmin}
      />
    </>
  );
}
