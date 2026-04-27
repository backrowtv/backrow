"use server";

/**
 * Event RSVP Actions
 *
 * Functions for managing event RSVPs.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateClub } from "@/lib/cache/invalidate";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { handleActionError } from "@/lib/errors/handler";
import { checkMemberPermission } from "./helpers";
import type { RSVPStatus } from "./types";

export async function rsvpToEvent(eventId: string, status: RSVPStatus) {
  const rateCheck = await actionRateLimit("rsvpToEvent", { limit: 30, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Get event to check club membership
  const { data: event, error: fetchError } = await supabase
    .from("club_events")
    .select("club_id, status, max_attendees")
    .eq("id", eventId)
    .single();

  if (fetchError || !event) {
    return { error: "Event not found" };
  }

  // Check event is not cancelled or completed
  if (event.status === "cancelled") {
    return { error: "Cannot RSVP to a cancelled event" };
  }
  if (event.status === "completed") {
    return { error: "Cannot RSVP to a completed event" };
  }

  // Check membership
  const isMember = await checkMemberPermission(event.club_id, user.id);
  if (!isMember) {
    return { error: "You must be a member to RSVP" };
  }

  // Check max attendees if setting to 'going'
  if (status === "going" && event.max_attendees) {
    const { count } = await supabase
      .from("club_event_rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "going");

    if (count && count >= event.max_attendees) {
      // Check if user is already going (updating their RSVP)
      const { data: existingRsvp } = await supabase
        .from("club_event_rsvps")
        .select("status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingRsvp || existingRsvp.status !== "going") {
        return { error: "Event is at capacity" };
      }
    }
  }

  // Upsert RSVP
  const { error } = await supabase.from("club_event_rsvps").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "event_id,user_id",
    }
  );

  if (error) {
    return handleActionError(error, "rsvpToEvent");
  }

  invalidateClub(event.club_id);

  return { success: true };
}

export async function removeRsvp(eventId: string) {
  const rateCheck = await actionRateLimit("removeRsvp", { limit: 30, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Get event for revalidation
  const { data: event } = await supabase
    .from("club_events")
    .select("club_id")
    .eq("id", eventId)
    .single();

  const { error } = await supabase
    .from("club_event_rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) {
    return handleActionError(error, "removeRsvp");
  }

  if (event) {
    invalidateClub(event.club_id);
  }

  return { success: true };
}

export async function getUserRsvp(eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null };
  }

  const { data: rsvp, error } = await supabase
    .from("club_event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message, data: null };
  }

  return { data: (rsvp?.status as RSVPStatus | null) || null, error: null };
}
