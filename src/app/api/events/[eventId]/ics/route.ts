import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateICS, generateICSFilename } from "@/lib/utils/ics-generator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch event with movie data (RLS validates club membership)
    const { data: event, error } = await supabase
      .from("club_events")
      .select(
        `
        id,
        title,
        description,
        event_date,
        end_date,
        location,
        movie:tmdb_id (title)
      `
      )
      .eq("id", eventId)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Handle movie data (can be array or object from Supabase)
    const movie = Array.isArray(event.movie) ? event.movie[0] : event.movie;

    // Generate ICS content
    const icsContent = generateICS(
      {
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        end_date: event.end_date,
        location: event.location,
      },
      movie
    );

    // Generate safe filename
    const filename = generateICSFilename(event.title);

    // Return ICS file as downloadable attachment
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Error generating ICS:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
