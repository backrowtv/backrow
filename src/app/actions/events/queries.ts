"use server";

/**
 * Event Query Actions
 *
 * Functions for fetching event data.
 */

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import { checkMemberPermission } from "./helpers";
import type { ClubEvent, EventRSVP, EventStatus, EventAttendee, RSVPStatus } from "./types";

export async function getClubEvents(
  clubId: string,
  options?: {
    status?: EventStatus | EventStatus[];
    limit?: number;
    includeRsvps?: boolean;
    upcoming?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null };
  }

  // Check membership
  const isMember = await checkMemberPermission(clubId, user.id);
  if (!isMember) {
    return { error: "You must be a member to view events", data: null };
  }

  let query = supabase
    .from("club_events")
    .select(
      `
      *,
      creator:created_by (
        id,
        display_name,
        avatar_url,
        social_links
      ),
      movie:tmdb_id (
        tmdb_id,
        title,
        poster_url
      )
    `
    )
    .eq("club_id", clubId);

  // Filter by status
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in("status", options.status);
    } else {
      query = query.eq("status", options.status);
    }
  }

  // Filter upcoming events
  if (options?.upcoming) {
    query = query.in("status", ["upcoming", "ongoing"]).gte("event_date", new Date().toISOString());
  }

  // Order by event date
  query = query.order("event_date", { ascending: true });

  // Limit
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: events, error } = await query;

  if (error) {
    return { ...handleActionError(error, "getClubEvents"), data: null };
  }

  // Fetch RSVPs if requested
  if (options?.includeRsvps && events && events.length > 0) {
    const eventIds = events.map((e) => e.id);

    const { data: rsvps } = await supabase
      .from("club_event_rsvps")
      .select(
        `
        event_id,
        user_id,
        status,
        created_at,
        user:user_id (
          id,
          display_name,
          avatar_url,
          social_links
        )
      `
      )
      .in("event_id", eventIds)
      .returns<EventRSVP[]>();

    // Group RSVPs by event
    const rsvpsByEvent = new Map<string, EventRSVP[]>();
    rsvps?.forEach((rsvp) => {
      const existing = rsvpsByEvent.get(rsvp.event_id) || [];
      existing.push(rsvp);
      rsvpsByEvent.set(rsvp.event_id, existing);
    });

    // Attach RSVPs and counts to events
    events.forEach((event: ClubEvent) => {
      const eventRsvps = rsvpsByEvent.get(event.id) || [];
      event.rsvps = eventRsvps;
      event.rsvp_counts = {
        going: eventRsvps.filter((r) => r.status === "going").length,
        maybe: eventRsvps.filter((r) => r.status === "maybe").length,
        not_going: eventRsvps.filter((r) => r.status === "not_going").length,
      };
    });
  }

  return { data: events as ClubEvent[], error: null };
}

export async function getEvent(eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null };
  }

  const { data: event, error } = await supabase
    .from("club_events")
    .select(
      `
      *,
      creator:created_by (
        id,
        display_name,
        avatar_url,
        social_links
      ),
      movie:tmdb_id (
        tmdb_id,
        title,
        poster_url
      )
    `
    )
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return { error: "Event not found", data: null };
  }

  // Check membership
  const isMember = await checkMemberPermission(event.club_id, user.id);
  if (!isMember) {
    return { error: "You must be a member to view this event", data: null };
  }

  // Fetch RSVPs
  const { data: rsvps } = await supabase
    .from("club_event_rsvps")
    .select(
      `
      event_id,
      user_id,
      status,
      created_at,
      user:user_id (
        id,
        display_name,
        avatar_url,
        social_links
      )
    `
    )
    .eq("event_id", eventId)
    .returns<EventRSVP[]>();

  const typedEvent = event as ClubEvent;
  typedEvent.rsvps = rsvps || [];
  typedEvent.rsvp_counts = {
    going: typedEvent.rsvps.filter((r) => r.status === "going").length,
    maybe: typedEvent.rsvps.filter((r) => r.status === "maybe").length,
    not_going: typedEvent.rsvps.filter((r) => r.status === "not_going").length,
  };

  return { data: typedEvent, error: null };
}

export async function getEventAttendees(eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null };
  }

  // Get event to check membership
  const { data: event, error: eventError } = await supabase
    .from("club_events")
    .select("club_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return { error: "Event not found", data: null };
  }

  // Check membership
  const isMember = await checkMemberPermission(event.club_id, user.id);
  if (!isMember) {
    return { error: "You must be a member to view event attendees", data: null };
  }

  // Fetch all RSVPs with user details
  const { data: rsvps, error } = await supabase
    .from("club_event_rsvps")
    .select(
      `
      user_id,
      status,
      created_at,
      user:user_id (id, display_name, avatar_url, username, avatar_icon, avatar_color_index, avatar_border_color_index)
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ...handleActionError(error, "getEventAttendees"), data: null };
  }

  const attendees: EventAttendee[] = (rsvps || []).map((rsvp) => ({
    user_id: rsvp.user_id,
    status: rsvp.status as RSVPStatus,
    created_at: rsvp.created_at,
    user: Array.isArray(rsvp.user) ? rsvp.user[0] : rsvp.user,
  }));

  return { data: attendees, error: null };
}

export async function getPastEvents(
  clubId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null, total: 0 };
  }

  // Check membership
  const isMember = await checkMemberPermission(clubId, user.id);
  if (!isMember) {
    return { error: "You must be a member to view events", data: null, total: 0 };
  }

  const now = new Date().toISOString();

  // Build query for past events
  let query = supabase
    .from("club_events")
    .select(
      `
      *,
      creator:created_by (
        id,
        display_name,
        avatar_url,
        social_links
      ),
      movie:tmdb_id (
        tmdb_id,
        title,
        poster_url
      )
    `,
      { count: "exact" }
    )
    .eq("club_id", clubId)
    .or(`status.eq.completed,event_date.lt.${now}`)
    .order("event_date", { ascending: false });

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data: events, error, count } = await query;

  if (error) {
    return { ...handleActionError(error, "getPastEvents"), data: null, total: 0 };
  }

  if (!events || events.length === 0) {
    return { data: [], error: null, total: 0 };
  }

  // Fetch RSVP counts for all events
  const eventIds = events.map((e) => e.id);
  const { data: allRsvps } = await supabase
    .from("club_event_rsvps")
    .select("event_id, status")
    .in("event_id", eventIds);

  // Add RSVP counts to events
  const eventsWithCounts = events.map((event) => {
    const eventRsvps = allRsvps?.filter((r) => r.event_id === event.id) || [];
    return {
      ...event,
      creator: Array.isArray(event.creator) ? event.creator[0] : event.creator,
      movie: Array.isArray(event.movie) ? event.movie[0] : event.movie,
      rsvp_counts: {
        going: eventRsvps.filter((r) => r.status === "going").length,
        maybe: eventRsvps.filter((r) => r.status === "maybe").length,
        not_going: eventRsvps.filter((r) => r.status === "not_going").length,
      },
    };
  }) as ClubEvent[];

  return { data: eventsWithCounts, error: null, total: count || 0 };
}
