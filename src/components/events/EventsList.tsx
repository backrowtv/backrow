"use client";

import { EventCard } from "./EventCard";
import type { ClubEvent, RSVPStatus } from "@/app/actions/events";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface EventsListProps {
  events: ClubEvent[];
  clubSlug: string;
  userRsvps?: Map<string, RSVPStatus>;
  compact?: boolean;
  emptyMessage?: string;
  className?: string;
  isAdmin?: boolean;
}

export function EventsList({
  events,
  clubSlug,
  userRsvps,
  compact = false,
  emptyMessage = "No events scheduled",
  className,
  isAdmin = false,
}: EventsListProps) {
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
    <div className={cn(compact ? "space-y-2" : "grid gap-4", className)}>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          clubSlug={clubSlug}
          userRsvpStatus={userRsvps?.get(event.id)}
          compact={compact}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
