import type { SupabaseClient } from "@supabase/supabase-js";

export async function autoJoinFeaturedClub(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: featuredClub } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "backrow-featured")
    .single();

  if (!featuredClub) return;

  await supabase
    .from("club_members")
    .upsert(
      { club_id: featuredClub.id, user_id: userId, role: "critic" },
      { onConflict: "club_id,user_id" }
    );
}
