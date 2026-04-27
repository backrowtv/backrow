"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateClub, invalidateMovie, invalidateUser } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

/**
 * Create a club note (discussion) for a movie
 */
export async function createClubNote(
  clubId: string,
  tmdbId: number,
  note: string
): Promise<{ error?: string; data?: unknown }> {
  const rateCheck = await actionRateLimit("createClubNote", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Validate note
  const trimmedNote = note.trim();
  if (!trimmedNote || trimmedNote.length === 0) {
    return { error: "Note cannot be empty" };
  }

  if (trimmedNote.length > 5000) {
    return { error: "Note is too long (max 5000 characters)" };
  }

  // Verify user is a member of the club
  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You are not a member of this club" };
  }

  // Insert note
  const { data, error } = await supabase
    .from("club_notes")
    .insert({
      club_id: clubId,
      user_id: user.id,
      tmdb_id: tmdbId,
      note: trimmedNote,
    })
    .select(
      `
      *,
      user:user_id (display_name, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index),
      club:club_id (name)
    `
    )
    .single();

  if (error) {
    return handleActionError(error, "createClubNote");
  }

  invalidateMovie(tmdbId);
  invalidateClub(clubId);
  return { data };
}

/**
 * Update a club note
 */
export async function updateClubNote(
  noteId: string,
  note: string
): Promise<{ error?: string; data?: unknown }> {
  const rateCheck = await actionRateLimit("updateClubNote", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Validate note
  const trimmedNote = note.trim();
  if (!trimmedNote || trimmedNote.length === 0) {
    return { error: "Note cannot be empty" };
  }

  if (trimmedNote.length > 5000) {
    return { error: "Note is too long (max 5000 characters)" };
  }

  // Verify user owns the note
  const { data: existingNote } = await supabase
    .from("club_notes")
    .select("user_id, tmdb_id, club_id")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { error: "Note not found" };
  }

  if (existingNote.user_id !== user.id) {
    return { error: "You can only edit your own notes" };
  }

  // Update note
  const { data, error } = await supabase
    .from("club_notes")
    .update({
      note: trimmedNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select(
      `
      *,
      user:user_id (display_name, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index),
      club:club_id (name)
    `
    )
    .single();

  if (error) {
    return handleActionError(error, "updateClubNote");
  }

  invalidateMovie(existingNote.tmdb_id);
  if (existingNote.club_id) invalidateClub(existingNote.club_id);
  return { data };
}

/**
 * Delete a club note
 */
export async function deleteClubNote(noteId: string): Promise<{ error?: string }> {
  const rateCheck = await actionRateLimit("deleteClubNote", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Verify user owns the note
  const { data: existingNote } = await supabase
    .from("club_notes")
    .select("user_id, tmdb_id, club_id")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { error: "Note not found" };
  }

  if (existingNote.user_id !== user.id) {
    return { error: "You can only delete your own notes" };
  }

  // Delete note
  const { error } = await supabase.from("club_notes").delete().eq("id", noteId);

  if (error) {
    return handleActionError(error, "deleteClubNote");
  }

  invalidateMovie(existingNote.tmdb_id);
  if (existingNote.club_id) invalidateClub(existingNote.club_id);
  return {};
}

// ============================================
// PRIVATE NOTES
// ============================================

export interface PrivateNote {
  id: string;
  user_id: string;
  tmdb_id: number;
  note: string;
  created_at: string;
  updated_at: string | null;
}

/**
 * Get all private notes for a movie
 */
export async function getPrivateNotes(
  tmdbId: number
): Promise<{ error?: string; data?: PrivateNote[] }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("private_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .order("created_at", { ascending: false });

  if (error) {
    return handleActionError(error, "getPrivateNotes");
  }

  return { data: data || [] };
}

/**
 * Create a new private note for a movie
 */
export async function createPrivateNote(
  tmdbId: number,
  note: string
): Promise<{ error?: string; data?: PrivateNote }> {
  const rateCheck = await actionRateLimit("createPrivateNote", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Validate note
  const trimmedNote = note.trim();
  if (!trimmedNote || trimmedNote.length === 0) {
    return { error: "Note cannot be empty" };
  }

  if (trimmedNote.length > 10000) {
    return { error: "Note is too long (max 10000 characters)" };
  }

  // Insert new note
  const { data, error } = await supabase
    .from("private_notes")
    .insert({
      user_id: user.id,
      tmdb_id: tmdbId,
      note: trimmedNote,
    })
    .select()
    .single();

  if (error) {
    return handleActionError(error, "createPrivateNote");
  }

  invalidateUser(user.id);
  return { data };
}

/**
 * Update an existing private note
 */
export async function updatePrivateNote(
  noteId: string,
  note: string
): Promise<{ error?: string; data?: PrivateNote }> {
  const rateCheck = await actionRateLimit("updatePrivateNote", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Validate note
  const trimmedNote = note.trim();
  if (!trimmedNote || trimmedNote.length === 0) {
    return { error: "Note cannot be empty" };
  }

  if (trimmedNote.length > 10000) {
    return { error: "Note is too long (max 10000 characters)" };
  }

  // Verify user owns the note
  const { data: existingNote } = await supabase
    .from("private_notes")
    .select("user_id, tmdb_id")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { error: "Note not found" };
  }

  if (existingNote.user_id !== user.id) {
    return { error: "You can only edit your own notes" };
  }

  // Update note
  const { data, error } = await supabase
    .from("private_notes")
    .update({
      note: trimmedNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select()
    .single();

  if (error) {
    return handleActionError(error, "updatePrivateNote");
  }

  invalidateUser(user.id);
  return { data };
}

/**
 * Delete a private note by ID
 */
export async function deletePrivateNote(noteId: string): Promise<{ error?: string }> {
  const rateCheck = await actionRateLimit("deletePrivateNote", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Verify user owns the note
  const { data: existingNote } = await supabase
    .from("private_notes")
    .select("user_id")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { error: "Note not found" };
  }

  if (existingNote.user_id !== user.id) {
    return { error: "You can only delete your own notes" };
  }

  const { error } = await supabase.from("private_notes").delete().eq("id", noteId);

  if (error) {
    return handleActionError(error, "deletePrivateNote");
  }

  invalidateUser(user.id);
  return {};
}

// ============================================
// FESTIVAL PRIVATE NOTES
// ============================================

export interface FestivalPrivateNote {
  id: string;
  user_id: string;
  festival_id: string;
  note: string;
  created_at: string;
  updated_at: string | null;
}

/**
 * Get all private notes for a festival
 */
export async function getFestivalPrivateNotes(
  festivalId: string
): Promise<{ error?: string; data?: FestivalPrivateNote[] }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("private_notes")
    .select("id, user_id, festival_id, note, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (error) {
    return handleActionError(error, "getFestivalPrivateNotes");
  }

  return { data: (data || []) as FestivalPrivateNote[] };
}

/**
 * Create a new private note for a festival
 */
export async function createFestivalPrivateNote(
  festivalId: string,
  note: string
): Promise<{ error?: string; data?: FestivalPrivateNote }> {
  const rateCheck = await actionRateLimit("createFestivalPrivateNote", {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  const trimmedNote = note.trim();
  if (!trimmedNote || trimmedNote.length === 0) {
    return { error: "Note cannot be empty" };
  }

  if (trimmedNote.length > 10000) {
    return { error: "Note is too long (max 10000 characters)" };
  }

  const { data, error } = await supabase
    .from("private_notes")
    .insert({
      user_id: user.id,
      festival_id: festivalId,
      note: trimmedNote,
    })
    .select("id, user_id, festival_id, note, created_at, updated_at")
    .single();

  if (error) {
    return handleActionError(error, "createFestivalPrivateNote");
  }

  return { data: data as FestivalPrivateNote };
}

/**
 * Update a festival private note
 */
export async function updateFestivalPrivateNote(
  noteId: string,
  note: string
): Promise<{ error?: string; data?: FestivalPrivateNote }> {
  const rateCheck = await actionRateLimit("updateFestivalPrivateNote", {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  const trimmedNote = note.trim();
  if (!trimmedNote || trimmedNote.length === 0) {
    return { error: "Note cannot be empty" };
  }

  if (trimmedNote.length > 10000) {
    return { error: "Note is too long (max 10000 characters)" };
  }

  const { data: existingNote } = await supabase
    .from("private_notes")
    .select("user_id")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { error: "Note not found" };
  }

  if (existingNote.user_id !== user.id) {
    return { error: "You can only edit your own notes" };
  }

  const { data, error } = await supabase
    .from("private_notes")
    .update({
      note: trimmedNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select("id, user_id, festival_id, note, created_at, updated_at")
    .single();

  if (error) {
    return handleActionError(error, "updateFestivalPrivateNote");
  }

  return { data: data as FestivalPrivateNote };
}

/**
 * Delete a festival private note
 */
export async function deleteFestivalPrivateNote(noteId: string): Promise<{ error?: string }> {
  const rateCheck = await actionRateLimit("deleteFestivalPrivateNote", {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  const { data: existingNote } = await supabase
    .from("private_notes")
    .select("user_id")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { error: "Note not found" };
  }

  if (existingNote.user_id !== user.id) {
    return { error: "You can only delete your own notes" };
  }

  const { error } = await supabase.from("private_notes").delete().eq("id", noteId);

  if (error) {
    return handleActionError(error, "deleteFestivalPrivateNote");
  }

  return {};
}
