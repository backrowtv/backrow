"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { invalidateMarketing } from "@/lib/cache/invalidate";

// Helper to check if user is a site admin
// Uses the site_admins table for role-based access control
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check the site_admins table for role-based admin access
  const { data: adminRecord } = await supabase
    .from("site_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  return !!adminRecord;
}

// Helper to require admin access - throws if not admin
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", user: null, supabase };
  }

  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    return { error: "Unauthorized", user: null, supabase };
  }

  return { error: null, user, supabase };
}

// Get admin dashboard data
export async function getAdminDashboardData() {
  const { error, supabase } = await requireAdmin();
  if (error) {
    return { error };
  }

  // Get site stats
  const [usersResult, clubsResult, festivalsResult, announcementsResult, settingsResult] =
    await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("clubs").select("id", { count: "exact", head: true }),
      supabase.from("festivals").select("id", { count: "exact", head: true }),
      supabase.from("site_announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("site_settings").select("*"),
    ]);

  // Get recent users
  const { data: recentUsers } = await supabase
    .from("users")
    .select("id, email, username, display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // Get featured club info
  const featuredClubSetting = settingsResult.data?.find((s) => s.key === "featured_club_id");
  let featuredClub = null;
  if (featuredClubSetting) {
    // Value is stored as JSONB, may be a string directly or need parsing
    const settingValue = featuredClubSetting.value;
    const clubId = typeof settingValue === "string" ? settingValue : String(settingValue);
    const { data: club } = await supabase
      .from("clubs")
      .select("id, name, slug, description, featured")
      .eq("id", clubId)
      .single();
    featuredClub = club;
  }

  // Get all public clubs for dropdown (private clubs cannot be featured)
  const { data: allClubs } = await supabase
    .from("clubs")
    .select("id, name, slug, privacy")
    .neq("privacy", "private")
    .eq("archived", false)
    .order("name");

  return {
    stats: {
      totalUsers: usersResult.count || 0,
      totalClubs: clubsResult.count || 0,
      totalFestivals: festivalsResult.count || 0,
    },
    announcements: announcementsResult.data || [],
    settings: settingsResult.data || [],
    recentUsers: recentUsers || [],
    featuredClub,
    allClubs: allClubs || [],
  };
}

// Get admin overview data — enhanced stats for the command center
export async function getAdminOverviewData() {
  const { error, supabase } = await requireAdmin();
  if (error) {
    return { error };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const now = new Date().toISOString();

  // Parallel queries for all stats
  const [
    usersResult,
    newUsersResult,
    clubsResult,
    activeClubsResult,
    festivalsResult,
    runningFestivalsResult,
    activeAnnouncementsResult,
    openBugsResult,
    openFeaturesResult,
    activeCollectionsResult,
    settingsResult,
    recentUsersResult,
    staleAnnouncementsResult,
  ] = await Promise.all([
    // Total users
    supabase.from("users").select("id", { count: "exact", head: true }),
    // New users this week
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgoISO),
    // Total clubs
    supabase.from("clubs").select("id", { count: "exact", head: true }),
    // Active (non-archived) clubs
    supabase.from("clubs").select("id", { count: "exact", head: true }).eq("archived", false),
    // Total festivals
    supabase.from("festivals").select("id", { count: "exact", head: true }),
    // Currently running festivals (status = nominating, rating, or voting)
    supabase
      .from("festivals")
      .select("id", { count: "exact", head: true })
      .in("status", ["nominating", "rating", "voting", "guessing"]),
    // Active announcements
    supabase
      .from("site_announcements")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    // Open bug reports
    supabase
      .from("feedback_items")
      .select("id", { count: "exact", head: true })
      .eq("type", "bug")
      .eq("status", "open"),
    // Open feature requests
    supabase
      .from("feedback_items")
      .select("id", { count: "exact", head: true })
      .eq("type", "feature")
      .eq("status", "open"),
    // Active curated collections
    supabase
      .from("curated_collections")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    // Site settings (for featured club)
    supabase.from("site_settings").select("*"),
    // Recent signups (last 5)
    supabase
      .from("users")
      .select("id, email, username, display_name, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    // Stale announcements (active but expired)
    supabase
      .from("site_announcements")
      .select("id, title, type, expires_at")
      .eq("is_active", true)
      .lt("expires_at", now)
      .not("expires_at", "is", null),
  ]);

  // Get featured club info
  const featuredClubSetting = settingsResult.data?.find((s) => s.key === "featured_club_id");
  let featuredClub = null;
  if (featuredClubSetting) {
    const settingValue = featuredClubSetting.value;
    const clubId = typeof settingValue === "string" ? settingValue : String(settingValue);
    const { data: club } = await supabase
      .from("clubs")
      .select("id, name, slug, description, featured")
      .eq("id", clubId)
      .single();
    featuredClub = club;
  }

  // Get all public clubs for the featured club selector
  const { data: allClubs } = await supabase
    .from("clubs")
    .select("id, name, slug, privacy")
    .neq("privacy", "private")
    .eq("archived", false)
    .order("name");

  // Get top open feedback items by vote count
  const { data: topFeedbackRaw } = await supabase
    .from("feedback_items")
    .select("id, title, type, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(10);

  // Get vote counts for top feedback
  let topFeedback: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    created_at: string;
    vote_count: number;
  }> = [];

  if (topFeedbackRaw && topFeedbackRaw.length > 0) {
    const feedbackIds = topFeedbackRaw.map((f) => f.id);
    const { data: votes } = await supabase
      .from("feedback_votes")
      .select("feedback_id")
      .in("feedback_id", feedbackIds);

    const voteCounts: Record<string, number> = {};
    if (votes) {
      votes.forEach((v) => {
        voteCounts[v.feedback_id] = (voteCounts[v.feedback_id] || 0) + 1;
      });
    }

    topFeedback = topFeedbackRaw
      .map((f) => ({ ...f, vote_count: voteCounts[f.id] || 0 }))
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 5);
  }

  return {
    stats: {
      totalUsers: usersResult.count || 0,
      newUsersThisWeek: newUsersResult.count || 0,
      totalClubs: clubsResult.count || 0,
      activeClubs: activeClubsResult.count || 0,
      totalFestivals: festivalsResult.count || 0,
      runningFestivals: runningFestivalsResult.count || 0,
      activeAnnouncements: activeAnnouncementsResult.count || 0,
      openBugs: openBugsResult.count || 0,
      openFeatures: openFeaturesResult.count || 0,
      activeCollections: activeCollectionsResult.count || 0,
    },
    featuredClub,
    allClubs: allClubs || [],
    recentUsers: recentUsersResult.data || [],
    topFeedback,
    staleAnnouncements: staleAnnouncementsResult.data || [],
  };
}

// Update a site setting
export async function updateSiteSetting(key: string, value: unknown) {
  const { error: authError, user, supabase } = await requireAdmin();
  if (authError || !user) {
    return { error: authError || "Unauthorized" };
  }

  const { error: dbError } = await supabase.from("site_settings").upsert({
    key,
    value: JSON.stringify(value),
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

// Set featured club
export async function setFeaturedClub(clubId: string) {
  const { error: authError, user, supabase } = await requireAdmin();
  if (authError || !user) {
    return { error: authError || "Unauthorized" };
  }

  // Check if club exists and is public
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, privacy")
    .eq("id", clubId)
    .single();

  if (clubError || !club) {
    return { error: "Club not found" };
  }

  // Only allow public clubs to be featured
  if (club.privacy === "private") {
    return { error: "Private clubs cannot be featured. Please select a public club." };
  }

  // Update site setting
  const { error: settingError } = await supabase.from("site_settings").upsert(
    {
      key: "featured_club_id",
      value: clubId, // JSONB column accepts the value directly
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    {
      onConflict: "key",
    }
  );

  if (settingError) {
    return { error: settingError.message };
  }

  // Clear featured flag from all clubs first
  await supabase.from("clubs").update({ featured: false }).eq("featured", true);

  // Set the new featured club
  const { error: updateError } = await supabase
    .from("clubs")
    .update({
      featured: true,
      featured_at: new Date().toISOString(),
    })
    .eq("id", clubId);

  if (updateError) {
    return { error: updateError.message };
  }

  invalidateMarketing("featured-club");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// Create site announcement
export async function createSiteAnnouncement(data: {
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "update";
  showOnLanding: boolean;
  showOnDashboard: boolean;
  expiresAt?: string;
}) {
  const { error: authError, user, supabase } = await requireAdmin();
  if (authError || !user) {
    return { error: authError || "Unauthorized" };
  }

  const { error } = await supabase.from("site_announcements").insert({
    title: data.title,
    message: data.message,
    type: data.type,
    show_on_landing: data.showOnLanding,
    show_on_dashboard: data.showOnDashboard,
    expires_at: data.expiresAt || null,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

// Update site announcement
export async function updateSiteAnnouncement(
  id: string,
  data: {
    title?: string;
    message?: string;
    type?: "info" | "warning" | "success" | "update";
    isActive?: boolean;
    showOnLanding?: boolean;
    showOnDashboard?: boolean;
    expiresAt?: string | null;
  }
) {
  const { error: authError, supabase } = await requireAdmin();
  if (authError) {
    return { error: authError };
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.message !== undefined) updateData.message = data.message;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.showOnLanding !== undefined) updateData.show_on_landing = data.showOnLanding;
  if (data.showOnDashboard !== undefined) updateData.show_on_dashboard = data.showOnDashboard;
  if (data.expiresAt !== undefined) updateData.expires_at = data.expiresAt;

  const { error } = await supabase.from("site_announcements").update(updateData).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

// Delete site announcement
export async function deleteSiteAnnouncement(id: string) {
  const { error: authError, supabase } = await requireAdmin();
  if (authError) {
    return { error: authError };
  }

  const { error } = await supabase.from("site_announcements").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

// Get active announcements for display (public - no admin check needed)
export async function getActiveAnnouncements(location: "landing" | "dashboard") {
  const supabase = await createClient();

  let query = supabase
    .from("site_announcements")
    .select("id, title, message, type, priority")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (location === "landing") {
    query = query.eq("show_on_landing", true);
  } else {
    query = query.eq("show_on_dashboard", true);
  }

  // Filter by date range
  query = query
    .lte("starts_at", new Date().toISOString())
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return data || [];
}

// Search and paginate users
export async function searchUsers(params: {
  query?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "username" | "display_name";
  sortDir?: "asc" | "desc";
}) {
  const { error: authError, supabase } = await requireAdmin();
  if (authError) {
    return { error: authError, data: [], total: 0 };
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 25;
  const sortBy = params.sortBy || "created_at";
  const sortDir = params.sortDir || "desc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("users")
    .select(
      "id, email, username, display_name, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index, created_at",
      { count: "exact" }
    );

  if (params.query && params.query.trim()) {
    const q = `%${params.query.trim()}%`;
    query = query.or(`email.ilike.${q},username.ilike.${q},display_name.ilike.${q}`);
  }

  query = query.order(sortBy, { ascending: sortDir === "asc" }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { error: error.message, data: [], total: 0 };
  }

  // Check which users are admins
  const userIds = (data || []).map((u) => u.id);
  const { data: adminRecords } = await supabase
    .from("site_admins")
    .select("user_id")
    .in("user_id", userIds);

  const adminSet = new Set((adminRecords || []).map((a) => a.user_id));

  const users = (data || []).map((u) => ({
    ...u,
    is_admin: adminSet.has(u.id),
  }));

  return { data: users, total: count || 0 };
}

// List all site admins with user info
export async function listSiteAdmins() {
  const { error: authError, supabase } = await requireAdmin();
  if (authError) {
    return { error: authError, data: [] };
  }

  const { data: admins, error } = await supabase
    .from("site_admins")
    .select(
      `
      user_id,
      role,
      created_at,
      user:users!site_admins_user_id_fkey (
        id,
        display_name,
        username,
        email,
        avatar_url,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      )
    `
    )
    .order("created_at", { ascending: true });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: admins || [] };
}

// Add a site admin
export async function addSiteAdmin(userId: string) {
  const { error: authError, user, supabase } = await requireAdmin();
  if (authError || !user) {
    return { error: authError || "Unauthorized" };
  }

  // Verify user exists
  const { data: targetUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (userError || !targetUser) {
    return { error: "User not found" };
  }

  // Check if already admin
  const { data: existing } = await supabase
    .from("site_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return { error: "User is already an admin" };
  }

  const { error: insertError } = await supabase.from("site_admins").insert({
    user_id: userId,
    role: "admin",
    created_by: user.id,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

// Remove a site admin
export async function removeSiteAdmin(userId: string) {
  const { error: authError, user, supabase } = await requireAdmin();
  if (authError || !user) {
    return { error: authError || "Unauthorized" };
  }

  // Prevent removing yourself
  if (userId === user.id) {
    return { error: "You cannot remove yourself as an admin" };
  }

  const { error: deleteError } = await supabase.from("site_admins").delete().eq("user_id", userId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/admin");
  return { success: true };
}
