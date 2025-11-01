import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve a club by slug or ID
 * Returns the club ID (UUID) regardless of whether slug or ID was provided
 *
 * @param supabase - Supabase client instance
 * @param identifier - Either a club slug or club ID (UUID)
 * @returns Promise resolving to club ID (UUID) or null if not found
 */
export async function resolveClub(
  supabase: SupabaseClient,
  identifier: string
): Promise<{ id: string; slug: string | null; theme_color: string | null } | null> {
  // Check if identifier is a UUID (36 chars with dashes)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  if (isUUID) {
    // Try to find by ID (exclude archived clubs)
    const { data: club } = await supabase
      .from("clubs")
      .select("id, slug, theme_color")
      .eq("id", identifier)
      .eq("archived", false)
      .maybeSingle();

    return club || null;
  } else {
    // Try to find by slug (exclude archived clubs)
    const { data: club } = await supabase
      .from("clubs")
      .select("id, slug, theme_color")
      .eq("slug", identifier)
      .eq("archived", false)
      .maybeSingle();

    return club || null;
  }
}

/**
 * Resolve a festival by slug or ID within a club
 * Returns the festival ID (UUID) regardless of whether slug or ID was provided
 *
 * @param supabase - Supabase client instance
 * @param clubId - The club ID (must be resolved first)
 * @param identifier - Either a festival slug or festival ID (UUID)
 * @returns Promise resolving to festival ID (UUID) or null if not found
 */
export async function resolveFestival(
  supabase: SupabaseClient,
  clubId: string,
  identifier: string
): Promise<{ id: string; slug: string | null } | null> {
  // Check if identifier is a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  if (isUUID) {
    // Try to find by ID (must match club)
    const { data: festival } = await supabase
      .from("festivals")
      .select("id, slug")
      .eq("id", identifier)
      .eq("club_id", clubId)
      .maybeSingle();

    return festival || null;
  } else {
    // Try to find by slug (must match club)
    const { data: festival } = await supabase
      .from("festivals")
      .select("id, slug")
      .eq("slug", identifier)
      .eq("club_id", clubId)
      .maybeSingle();

    return festival || null;
  }
}

/**
 * Resolve a discussion thread by slug or ID within a club
 * Returns the thread ID (UUID) regardless of whether slug or ID was provided
 *
 * @param supabase - Supabase client instance
 * @param clubId - The club ID (must be resolved first)
 * @param identifier - Either a thread slug or thread ID (UUID)
 * @returns Promise resolving to thread ID (UUID) or null if not found
 */
export async function resolveThread(
  supabase: SupabaseClient,
  clubId: string,
  identifier: string
): Promise<{ id: string; slug: string | null } | null> {
  // Check if identifier is a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  if (isUUID) {
    // Try to find by ID (must match club)
    const { data: thread } = await supabase
      .from("discussion_threads")
      .select("id, slug")
      .eq("id", identifier)
      .eq("club_id", clubId)
      .maybeSingle();

    return thread || null;
  } else {
    // Try to find by slug (must match club)
    const { data: thread } = await supabase
      .from("discussion_threads")
      .select("id, slug")
      .eq("slug", identifier)
      .eq("club_id", clubId)
      .maybeSingle();

    return thread || null;
  }
}
