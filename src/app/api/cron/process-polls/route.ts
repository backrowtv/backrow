import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { logger } from "@/lib/logger";

const ROUTE = "/api/cron/process-polls";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();

  // Find expired polls that haven't been processed and have action_type
  const { data: expiredPolls, error: fetchError } = await supabase
    .from("club_polls")
    .select(
      `
      id,
      club_id,
      user_id,
      question,
      options,
      action_type,
      action_data,
      expires_at
    `
    )
    .eq("action_type", "create_event")
    .is("processed_at", null)
    .not("expires_at", "is", null)
    .lte("expires_at", now)
    .limit(50);

  if (fetchError) {
    logger.error("cron:failed", {
      route: ROUTE,
      error: fetchError.message,
      ms: Date.now() - start,
    });
    return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
  }

  if (!expiredPolls || expiredPolls.length === 0) {
    logger.info("cron:done", {
      route: ROUTE,
      processed: 0,
      msg: "cron:no-work",
      ms: Date.now() - start,
    });
    return NextResponse.json({ message: "No polls to process", processed: 0 });
  }

  let processed = 0;
  let errors = 0;
  const results: Array<{ pollId: string; success: boolean; error?: string; eventId?: string }> = [];

  for (const poll of expiredPolls) {
    try {
      // Get votes for this poll
      const { data: votes, error: votesError } = await supabase
        .from("club_poll_votes")
        .select("option_index")
        .eq("poll_id", poll.id);

      if (votesError) {
        logger.error("cron:poll-error", {
          route: ROUTE,
          pollId: poll.id,
          error: votesError.message,
          step: "fetch-votes",
        });
        results.push({ pollId: poll.id, success: false, error: "Failed to fetch votes" });
        errors++;
        continue;
      }

      // Count votes per option
      const options = poll.options as string[];
      const voteCounts = new Map<number, number>();

      votes?.forEach((vote) => {
        const current = voteCounts.get(vote.option_index) || 0;
        voteCounts.set(vote.option_index, current + 1);
      });

      // Find winning option (most votes)
      let winningIndex = 0;
      let maxVotes = 0;

      options.forEach((_, index) => {
        const count = voteCounts.get(index) || 0;
        if (count > maxVotes) {
          maxVotes = count;
          winningIndex = index;
        }
      });

      const winningOption = options[winningIndex];
      const actionData = poll.action_data as { title?: string; description?: string } | null;

      // Validate action data
      if (!actionData?.title) {
        logger.error("cron:poll-error", {
          route: ROUTE,
          pollId: poll.id,
          error: "Missing event title in action_data",
          step: "validate",
        });
        results.push({
          pollId: poll.id,
          success: false,
          error: "Missing event title in action_data",
        });

        // Mark as processed to prevent retry
        await supabase.from("club_polls").update({ processed_at: now }).eq("id", poll.id);

        errors++;
        continue;
      }

      // Parse winning option as date
      let eventDate: Date;
      try {
        eventDate = new Date(winningOption);
        if (isNaN(eventDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch {
        logger.error("cron:poll-error", {
          route: ROUTE,
          pollId: poll.id,
          error: "Invalid date format",
          step: "parse-date",
          winningOption,
        });
        results.push({ pollId: poll.id, success: false, error: "Invalid date format" });

        // Mark as processed to prevent retry
        await supabase.from("club_polls").update({ processed_at: now }).eq("id", poll.id);

        errors++;
        continue;
      }

      // Create event
      const { data: event, error: eventError } = await supabase
        .from("club_events")
        .insert({
          club_id: poll.club_id,
          created_by: poll.user_id,
          poll_id: poll.id,
          title: actionData.title,
          description: actionData.description || null,
          event_type: "watch_party",
          event_date: eventDate.toISOString(),
          status: "upcoming",
        })
        .select("id")
        .single();

      if (eventError) {
        logger.error("cron:poll-error", {
          route: ROUTE,
          pollId: poll.id,
          error: eventError.message,
          step: "create-event",
        });
        results.push({ pollId: poll.id, success: false, error: eventError.message });
        errors++;
        continue;
      }

      // Mark poll as processed
      await supabase.from("club_polls").update({ processed_at: now }).eq("id", poll.id);

      // Log activity
      await supabase.from("activity_log").insert({
        club_id: poll.club_id,
        user_id: poll.user_id,
        action: `event "${actionData.title}" was created from poll`,
        details: { eventId: event.id, pollId: poll.id, votes: maxVotes },
      });

      // Create notifications for club members
      const { data: members } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", poll.club_id);

      if (members && members.length > 0) {
        const notifications = members.map((member) => ({
          user_id: member.user_id,
          type: "event_created",
          title: "New Event Scheduled",
          message: `Event "${actionData.title}" has been scheduled based on poll results`,
          link: `/club/${poll.club_id}`,
          club_id: poll.club_id,
        }));

        await supabase.from("notifications").insert(notifications);
      }

      results.push({ pollId: poll.id, success: true, eventId: event.id });
      processed++;
    } catch (err) {
      logger.error("cron:poll-error", {
        route: ROUTE,
        pollId: poll.id,
        error: err instanceof Error ? err.message : String(err),
        step: "unexpected",
      });
      results.push({ pollId: poll.id, success: false, error: "Unexpected error" });
      errors++;
    }
  }

  logger.info("cron:done", {
    route: ROUTE,
    processed,
    errors,
    total: expiredPolls.length,
    ms: Date.now() - start,
  });

  return NextResponse.json({
    message: `Processed ${processed} polls, ${errors} errors`,
    processed,
    errors,
    results,
  });
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
