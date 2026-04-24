import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/security/postgrest-escape";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a member of the club
    const { data: membership } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this club" }, { status: 403 });
    }

    // Search festivals
    let query = supabase
      .from("festivals")
      .select("id, theme, slug, status, start_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false })
      .limit(20);

    // Filter by search term if provided
    if (search.trim()) {
      query = query.ilike("theme", `%${escapeLike(search)}%`);
    }

    const { data: festivals, error } = await query;

    if (error) {
      console.error("Festival search error:", error);
      return NextResponse.json({ error: "Failed to search festivals" }, { status: 500 });
    }

    return NextResponse.json({ festivals: festivals || [] });
  } catch (error) {
    console.error("Error searching festivals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
