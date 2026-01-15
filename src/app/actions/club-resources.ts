"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import type {
  ClubResource,
  CreateResourceInput,
  UpdateResourceInput,
} from "./club-resources.types";

/**
 * Get all resources for a club
 */
export async function getClubResources(clubId: string): Promise<ClubResource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("club_resources")
    .select("*")
    .eq("club_id", clubId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching club resources:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new club resource
 */
export async function createClubResource(
  input: CreateResourceInput
): Promise<{ success: boolean; error?: string; resource?: ClubResource }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", input.clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { success: false, error: "Not authorized" };
  }

  const resourceType = input.resourceType || "link";

  // Type-specific validation
  if (resourceType === "link") {
    if (!input.url?.trim()) {
      return { success: false, error: "URL is required for link resources" };
    }
  } else {
    // text or rules
    if (!input.content?.trim()) {
      return { success: false, error: "Content is required" };
    }
    if (input.content.length > 5000) {
      return { success: false, error: "Content must be under 5000 characters" };
    }
  }

  // Get max display_order
  const { data: maxOrderResult } = await supabase
    .from("club_resources")
    .select("display_order")
    .eq("club_id", input.clubId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrderResult?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("club_resources")
    .insert({
      club_id: input.clubId,
      title: input.title.trim(),
      resource_type: resourceType,
      url: resourceType === "link" ? input.url!.trim() : null,
      content: resourceType !== "link" ? input.content!.trim() : null,
      icon: input.icon || null,
      description: input.description?.trim() || null,
      display_order: nextOrder,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, ...handleActionError(error, "createClubResource") };
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", input.clubId)
    .single();

  if (club?.slug) {
    revalidatePath(`/club/${club.slug}`);
  }

  return { success: true, resource: data };
}

/**
 * Update a club resource
 */
export async function updateClubResource(
  input: UpdateResourceInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the resource to find the club_id and resource_type
  const { data: resource } = await supabase
    .from("club_resources")
    .select("club_id, resource_type")
    .eq("id", input.id)
    .single();

  if (!resource) {
    return { success: false, error: "Resource not found" };
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", resource.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { success: false, error: "Not authorized" };
  }

  // Validate content length if provided
  if (input.content && input.content.length > 5000) {
    return { success: false, error: "Content must be under 5000 characters" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.icon !== undefined) updateData.icon = input.icon || null;
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.display_order !== undefined) updateData.display_order = input.display_order;

  // Type-specific fields
  if (resource.resource_type === "link") {
    if (input.url !== undefined) updateData.url = input.url.trim();
  } else {
    if (input.content !== undefined) updateData.content = input.content.trim();
  }

  const { error } = await supabase.from("club_resources").update(updateData).eq("id", input.id);

  if (error) {
    return { success: false, ...handleActionError(error, "updateClubResource") };
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", resource.club_id)
    .single();

  if (club?.slug) {
    revalidatePath(`/club/${club.slug}`);
  }

  return { success: true };
}

/**
 * Delete a club resource
 */
export async function deleteClubResource(
  resourceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the resource to find the club_id
  const { data: resource } = await supabase
    .from("club_resources")
    .select("club_id")
    .eq("id", resourceId)
    .single();

  if (!resource) {
    return { success: false, error: "Resource not found" };
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", resource.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { success: false, error: "Not authorized" };
  }

  const { error } = await supabase.from("club_resources").delete().eq("id", resourceId);

  if (error) {
    return { success: false, ...handleActionError(error, "deleteClubResource") };
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", resource.club_id)
    .single();

  if (club?.slug) {
    revalidatePath(`/club/${club.slug}`);
  }

  return { success: true };
}

/**
 * Reorder club resources
 */
export async function reorderClubResources(
  clubId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { success: false, error: "Not authorized" };
  }

  // Update each resource's display_order
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("club_resources")
      .update({ display_order: i, updated_at: new Date().toISOString() })
      .eq("id", orderedIds[i])
      .eq("club_id", clubId);

    if (error) {
      return { success: false, ...handleActionError(error, "reorderClubResources") };
    }
  }

  // Get club slug for revalidation
  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();

  if (club?.slug) {
    revalidatePath(`/club/${club.slug}`);
  }

  return { success: true };
}
