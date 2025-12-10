"use server";

/**
 * Event CRUD Actions
 *
 * Create, update, delete operations for club events.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import { logClubActivity } from "@/lib/activity/logger";
import { createNotificationsForUsers } from "../notifications";
import { getClubSlug, checkAdminPermission } from "./helpers";
import type { EventType, EventStatus } from "./types";

export async function createEvent(
  clubId: string,
  data: {
    title: string;
    description?: string;
    event_type: EventType;
    event_date: string;
    end_date?: string;
    tmdb_id?: number;
    location?: string;
    max_attendees?: number;
    poll_id?: string;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check admin permission
  const isAdmin = await checkAdminPermission(clubId, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to create events" };
  }

  // Validate required fields
  if (!data.title?.trim()) {
    return { error: "Event title is required" };
  }
  if (!data.event_date) {
    return { error: "Event date is required" };
  }
  if (!data.event_type) {
    return { error: "Event type is required" };
  }

  // Create event
  const { data: event, error } = await supabase
    .from("club_events")
    .insert({
      club_id: clubId,
      created_by: user.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      event_type: data.event_type,
      event_date: data.event_date,
      end_date: data.end_date || null,
      tmdb_id: data.tmdb_id || null,
      location: data.location?.trim() || null,
      max_attendees: data.max_attendees || null,
      poll_id: data.poll_id || null,
      status: "upcoming",
    })
    .select()
    .single();

  if (error) {
    return handleActionError(error, "createEvent");
  }

  // Log club activity
  await logClubActivity(clubId, "event_created", {
    event_id: event.id,
    event_title: data.title,
    event_type: data.event_type,
  });

  // Notify all club members about the new event
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the creator

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(clubId);
    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "new_event",
      title: "New Event",
      message: `"${data.title}" has been scheduled!`,
      link: `/club/${clubSlugForLink}/upcoming`,
      clubId: clubId,
    });
  }

  const clubSlug = await getClubSlug(clubId);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/director/events`);
  revalidatePath(`/club/${clubSlug}/producer/events`);

  return { success: true, data: event };
}

export async function updateEvent(
  eventId: string,
  data: {
    title?: string;
    description?: string;
    event_type?: EventType;
    event_date?: string;
    end_date?: string | null;
    tmdb_id?: number | null;
    status?: EventStatus;
    location?: string | null;
    max_attendees?: number | null;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get event to check permissions
  const { data: existingEvent, error: fetchError } = await supabase
    .from("club_events")
    .select("club_id")
    .eq("id", eventId)
    .single();

  if (fetchError || !existingEvent) {
    return { error: "Event not found" };
  }

  // Check admin permission
  const isAdmin = await checkAdminPermission(existingEvent.club_id, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to update this event" };
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.event_type !== undefined) updateData.event_type = data.event_type;
  if (data.event_date !== undefined) updateData.event_date = data.event_date;
  if (data.end_date !== undefined) updateData.end_date = data.end_date;
  if (data.tmdb_id !== undefined) updateData.tmdb_id = data.tmdb_id;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.location !== undefined) updateData.location = data.location?.trim() || null;
  if (data.max_attendees !== undefined) updateData.max_attendees = data.max_attendees;

  // Get the original event for comparison
  const { data: originalEvent } = await supabase
    .from("club_events")
    .select("title, status, event_date")
    .eq("id", eventId)
    .single();

  const { data: event, error } = await supabase
    .from("club_events")
    .update(updateData)
    .eq("id", eventId)
    .select()
    .single();

  if (error) {
    return handleActionError(error, "updateEvent");
  }

  // Notify club members about event changes
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", existingEvent.club_id)
    .neq("user_id", user.id); // Don't notify the admin who made changes

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(existingEvent.club_id);
    const eventTitle = data.title || originalEvent?.title || "Event";

    if (data.status === "cancelled") {
      // Event was cancelled
      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id),
        type: "event_cancelled",
        title: "Event Cancelled",
        message: `"${eventTitle}" has been cancelled.`,
        link: `/club/${clubSlugForLink}/upcoming`,
        clubId: existingEvent.club_id,
      });

      // Log activity for cancellation
      await logClubActivity(existingEvent.club_id, "event_cancelled", {
        event_title: eventTitle,
        event_id: eventId,
      });
    } else if (
      originalEvent &&
      ((data.title && data.title !== originalEvent.title) ||
        (data.event_date && data.event_date !== originalEvent.event_date))
    ) {
      // Event was modified significantly (title or date) - notify members
      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id),
        type: "event_modified",
        title: "Event Updated",
        message: `"${eventTitle}" has been updated.`,
        link: `/club/${clubSlugForLink}/upcoming`,
        clubId: existingEvent.club_id,
      });
    }
  }

  // Always log activity when event is modified (regardless of which fields changed)
  await logClubActivity(existingEvent.club_id, "event_modified", {
    event_title: data.title || originalEvent?.title || "Event",
    event_id: eventId,
  });

  const clubSlug = await getClubSlug(existingEvent.club_id);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/director/events`);
  revalidatePath(`/club/${clubSlug}/producer/events`);

  return { success: true, data: event };
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get event to check permissions
  const { data: existingEvent, error: fetchError } = await supabase
    .from("club_events")
    .select("club_id, title")
    .eq("id", eventId)
    .single();

  if (fetchError || !existingEvent) {
    return { error: "Event not found" };
  }

  // Check admin permission
  const isAdmin = await checkAdminPermission(existingEvent.club_id, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to delete this event" };
  }

  const { error } = await supabase.from("club_events").delete().eq("id", eventId);

  if (error) {
    return handleActionError(error, "deleteEvent");
  }

  // Log club activity
  await logClubActivity(existingEvent.club_id, "event_cancelled", {
    event_id: eventId,
    event_title: existingEvent.title,
  });

  const clubSlug = await getClubSlug(existingEvent.club_id);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/director/events`);
  revalidatePath(`/club/${clubSlug}/producer/events`);

  return { success: true };
}

export async function cancelEvent(eventId: string) {
  return updateEvent(eventId, { status: "cancelled" });
}

/**
 * Create event from poll (Internal Use)
 */
export async function createEventFromPoll(
  pollId: string,
  winningOption: string,
  actionData: { title: string; description?: string; event_type?: EventType }
) {
  const supabase = await createClient();

  // Get poll data
  const { data: poll, error: pollError } = await supabase
    .from("club_polls")
    .select("club_id, user_id")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return handleActionError(pollError, "createEventFromPoll");
  }

  // Parse winning option as date
  const eventDate = new Date(winningOption);
  if (isNaN(eventDate.getTime())) {
    return handleActionError(
      new Error(`Invalid winning option date: ${winningOption}`),
      "createEventFromPoll"
    );
  }

  // Create event
  const { data: event, error } = await supabase
    .from("club_events")
    .insert({
      club_id: poll.club_id,
      created_by: poll.user_id,
      poll_id: pollId,
      title: actionData.title,
      description: actionData.description || null,
      event_type: actionData.event_type || "watch_party",
      event_date: eventDate.toISOString(),
      status: "upcoming",
    })
    .select()
    .single();

  if (error) {
    return handleActionError(error, "createEventFromPoll");
  }

  // Mark poll as processed
  await supabase
    .from("club_polls")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", pollId);

  // Log club activity
  await logClubActivity(poll.club_id, "event_created", {
    event_id: event.id,
    event_title: actionData.title,
    from_poll: true,
    poll_id: pollId,
  });

  const clubSlug = await getClubSlug(poll.club_id);
  revalidatePath(`/club/${clubSlug}`);

  return { success: true, data: event };
}
