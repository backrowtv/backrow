/**
 * Test Factory — Ambient "Lived-In" Data
 *
 * Populates non-festival data: events, RSVPs, announcements, polls,
 * chat, discussions, activity log, watch history, notes, theme pool,
 * movie pool, resources, and stack rankings.
 */

import { supabase, ensureMovie } from "./client";
import type { CreatedUser } from "./users";
import type { TestMovie } from "./movies";

// ── Helpers ──────────────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ── Theme Pool ───────────────────────────────────────────────────

const EXTRA_THEMES = [
  "Underrated Gems",
  "Directors' Debuts",
  "Based on True Events",
  "Road Trip Movies",
  "One Location Films",
  "Unreliable Narrators",
  "Movies That Made You Cry",
  "Pre-2000 Classics",
  "Foreign Language Films",
  "Cult Favorites",
  "Movies Nobody Else Has Seen",
  "Soundtracks That Slap",
];

export async function populateThemePool(
  clubId: string,
  members: CreatedUser[],
  usedThemes: string[]
): Promise<void> {
  // Insert used themes as is_used: true
  for (const theme of usedThemes) {
    await supabase.from("theme_pool").insert({
      club_id: clubId,
      theme_name: theme,
      added_by: randomFrom(members).id,
      is_used: true,
    });
  }

  // Insert 4-6 unused themes for future selection
  const unusedThemes = randomSubset(EXTRA_THEMES, 4, 6);
  const insertedThemeIds: string[] = [];

  for (const theme of unusedThemes) {
    const { data } = await supabase
      .from("theme_pool")
      .insert({
        club_id: clubId,
        theme_name: theme,
        added_by: randomFrom(members).id,
        is_used: false,
      })
      .select("id")
      .single();

    if (data) insertedThemeIds.push(data.id);
  }

  // Add votes on unused themes
  for (const themeId of insertedThemeIds) {
    const voters = randomSubset(members, 3, 7);
    for (const voter of voters) {
      await supabase.from("theme_pool_votes").insert({
        theme_id: themeId,
        user_id: voter.id,
        vote_type: "upvote",
      });
    }
  }

  console.log(`    Theme pool: ${usedThemes.length} used + ${unusedThemes.length} unused themes`);
}

// ── Movie Pool ───────────────────────────────────────────────────

const POOL_PITCHES = [
  "This would be incredible for a thriller night",
  "Underrated masterpiece — trust me on this one",
  "Perfect for our next festival theme",
  "We need to watch this as a group",
  "Guaranteed to spark debate",
  "A comfort movie everyone can enjoy",
  null,
  null,
];

export async function populateMoviePool(
  clubId: string,
  members: CreatedUser[],
  movies: TestMovie[]
): Promise<void> {
  const poolMovies = randomSubset(movies, 10, 15);

  for (const movie of poolMovies) {
    await ensureMovie(movie);

    const { data: poolItem } = await supabase
      .from("club_movie_pool")
      .insert({
        club_id: clubId,
        user_id: randomFrom(members).id,
        tmdb_id: movie.tmdbId,
        pitch: randomFrom(POOL_PITCHES),
      })
      .select("id")
      .single();

    // Add 2-5 votes per pool item
    if (poolItem) {
      const voters = randomSubset(members, 2, 5);
      for (const voter of voters) {
        await supabase.from("movie_pool_votes").insert({
          club_pool_item_id: poolItem.id,
          user_id: voter.id,
          vote_type: "upvote",
        });
      }
    }
  }

  console.log(`    Movie pool: ${poolMovies.length} suggestions`);
}

// ── Events + RSVPs ───────────────────────────────────────────────

interface EventTemplate {
  title: string;
  description: string;
  eventType: "watch_party" | "meetup" | "discussion" | "custom";
  location: string | null;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    title: "Friday Night Watch Party",
    description: "Watching this week's festival pick together. Bring snacks!",
    eventType: "watch_party",
    location: "Discord Voice Chat",
  },
  {
    title: "Weekend Movie Marathon",
    description: "Back-to-back double feature. Vote on what we watch in the poll.",
    eventType: "watch_party",
    location: "Discord Voice Chat",
  },
  {
    title: "Post-Festival Debrief",
    description: "Let's discuss the results and share our hot takes.",
    eventType: "discussion",
    location: null,
  },
  {
    title: "Monthly Meetup",
    description: "Grabbing drinks and talking movies. All welcome!",
    eventType: "meetup",
    location: "The Reel Bar & Grill",
  },
  {
    title: "Theme Brainstorm Session",
    description: "Help us come up with themes for next season's festivals.",
    eventType: "discussion",
    location: null,
  },
  {
    title: "Horror Movie Night",
    description: "Lights off, volume up. Watching something scary together.",
    eventType: "watch_party",
    location: "Discord Voice Chat",
  },
  {
    title: "Mid-Season Celebration",
    description: "Halfway through the season — let's celebrate our progress!",
    eventType: "custom",
    location: null,
  },
  {
    title: "New Member Welcome Party",
    description: "Welcoming our newest members with a casual watch.",
    eventType: "meetup",
    location: null,
  },
];

export async function populateEvents(
  clubId: string,
  members: CreatedUser[],
  seasonStart: Date,
  seasonEnd: Date
): Promise<string[]> {
  const templates = randomSubset(EVENT_TEMPLATES, 5, 8);
  const now = new Date();
  const eventIds: string[] = [];

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    const eventDate = randomDate(seasonStart, seasonEnd);
    const isPast = eventDate < now;

    const { data: event } = await supabase
      .from("club_events")
      .insert({
        club_id: clubId,
        created_by: members[0].id, // producer creates events
        title: tmpl.title,
        description: tmpl.description,
        event_type: tmpl.eventType,
        event_date: eventDate.toISOString(),
        location: tmpl.location,
        status: isPast ? "completed" : "upcoming",
        max_attendees: tmpl.eventType === "meetup" ? 15 : null,
      })
      .select("id")
      .single();

    if (!event) continue;
    eventIds.push(event.id);

    // RSVPs from 6-9 members with mixed statuses
    const rsvpMembers = randomSubset(members, 6, 9);
    const statuses: Array<"going" | "maybe" | "not_going"> = [
      "going",
      "going",
      "going",
      "going",
      "maybe",
      "maybe",
      "not_going",
    ];

    for (const member of rsvpMembers) {
      await supabase.from("club_event_rsvps").upsert(
        {
          event_id: event.id,
          user_id: member.id,
          status: randomFrom(statuses),
        },
        { onConflict: "event_id,user_id" }
      );
    }
  }

  console.log(`    Events: ${templates.length} events with RSVPs`);
  return eventIds;
}

// ── Announcements ────────────────────────────────────────────────

const ANNOUNCEMENT_TEMPLATES = [
  {
    title: "Welcome to Season 2025-2026!",
    message:
      "Excited to kick off a new season. We've got some great themes lined up. Remember: nominate wisely, rate honestly, and have fun!",
  },
  {
    title: "Festival #3 Starting Soon",
    message:
      "Theme submissions are open for our next festival. Head to the theme pool and vote on your favorites!",
  },
  {
    title: "Halfway Through the Season",
    message:
      "We're halfway through! Check the standings to see where you rank. It's still anyone's game.",
  },
  {
    title: "Reminder: Rate Before the Deadline",
    message:
      "A few of you haven't submitted ratings yet. Please rate all movies before the deadline so we can calculate results!",
  },
  {
    title: "Season Finale Approaching",
    message: "Only a couple festivals left this season. Make your nominations count!",
  },
];

export async function populateAnnouncements(
  clubId: string,
  producerId: string,
  seasonStart: Date,
  seasonEnd: Date
): Promise<void> {
  const count = 3 + Math.floor(Math.random() * 3); // 3-5
  const templates = ANNOUNCEMENT_TEMPLATES.slice(0, count);

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    const fraction = i / (templates.length - 1 || 1);
    const date = new Date(
      seasonStart.getTime() + fraction * (seasonEnd.getTime() - seasonStart.getTime())
    );

    await supabase.from("club_announcements").insert({
      club_id: clubId,
      user_id: producerId,
      title: tmpl.title,
      message: tmpl.message,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    });
  }

  console.log(`    Announcements: ${count}`);
}

// ── Polls ────────────────────────────────────────────────────────

const POLL_TEMPLATES = [
  {
    question: "Should we add a bonus round next season?",
    options: ["Yes, absolutely", "No, keep it simple", "Maybe — let's discuss"],
  },
  {
    question: "What night works best for watch parties?",
    options: ["Friday", "Saturday", "Sunday", "Weeknight"],
  },
  {
    question: "How are you feeling about the season so far?",
    options: ["Loving it", "It's good", "Could be better", "Need more festivals"],
  },
];

export async function populatePolls(
  clubId: string,
  members: CreatedUser[],
  seasonStart: Date,
  seasonEnd: Date
): Promise<void> {
  const count = 2 + Math.floor(Math.random() * 2); // 2-3
  const templates = POLL_TEMPLATES.slice(0, count);

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    const date = randomDate(seasonStart, seasonEnd);

    const { data: poll } = await supabase
      .from("club_polls")
      .insert({
        club_id: clubId,
        user_id: members[0].id,
        question: tmpl.question,
        options: tmpl.options,
        allow_multiple: false,
        is_anonymous: false,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
      })
      .select("id")
      .single();

    if (!poll) continue;

    // 6-8 members vote
    const voters = randomSubset(members, 6, 8);
    for (const voter of voters) {
      const optionIndex = Math.floor(Math.random() * tmpl.options.length);
      await supabase.from("club_poll_votes").insert({
        poll_id: poll.id,
        user_id: voter.id,
        option_index: optionIndex,
      });
    }
  }

  console.log(`    Polls: ${count} with votes`);
}

// ── Chat Messages ────────────────────────────────────────────────

const CHAT_MESSAGES = [
  "Anyone else think the last festival was way too close?",
  "Still can't believe that movie won. Wild.",
  "When's the next watch party?",
  "Just watched the nomination — it's actually incredible.",
  "lol who nominated that",
  "My ratings are in! That was a tough one.",
  "This theme is going to be so good",
  "I already know what I'm nominating",
  "Can we do a horror theme next? Please??",
  "The standings are SO tight right now",
  "Great picks this festival, everyone",
  "I need to rewatch before I rate, one sec",
  "Hot take: the runner-up was better",
  "Why does nobody ever nominate comedies",
  "That pitch was hilarious, well done",
  "Guessing game is impossible with this group",
  "I nailed 7 out of 9 guesses last time",
  "No way, I got zero right haha",
  "Deadline is tomorrow! Hurry up y'all",
  "Who's joining the watch party tonight?",
  "Just submitted my guess, I'm terrified",
  "That ending though... wow",
  "Adding this to my future nominations list for sure",
  "Season finale is going to be epic",
  "GG everyone, great season",
  "New here! Excited to join",
  "Welcome!! You're going to love it",
  "Rate honestly — no pity points",
  "The results reveal was so stressful",
  "Can't wait for next season already",
  "Anyone else watching the Oscars tonight?",
  "This club has ruined my free time (in the best way)",
  "Okay, my nomination is going to surprise everyone",
  "I've been saving this pick for months",
  "The theme pool is stacked right now",
  "Vote for 'Unreliable Narrators' please!",
  "Friday works for me for the watch party",
  "Saturday is better for me tbh",
  "Let's do both?",
  "I just want to say: best club ever",
];

export async function populateChatMessages(
  clubId: string,
  members: CreatedUser[],
  seasonStart: Date,
  seasonEnd: Date
): Promise<void> {
  const count = 30 + Math.floor(Math.random() * 21); // 30-50
  const messages = randomSubset(CHAT_MESSAGES, count, count);

  for (const msg of messages) {
    const date = randomDate(seasonStart, seasonEnd);
    await supabase.from("chat_messages").insert({
      club_id: clubId,
      user_id: randomFrom(members).id,
      message: msg,
      created_at: date.toISOString(),
    });
  }

  console.log(`    Chat: ${count} messages`);
}

// ── Discussions ──────────────────────────────────────────────────

const COMMENT_TEMPLATES = [
  "Loved this one. The pacing was perfect.",
  "Not my favorite, but I can see why people like it.",
  "The cinematography alone makes it worth watching.",
  "Ending felt rushed but overall solid.",
  "This was my top pick for sure.",
  "Way better than I expected going in.",
  "The director really outdid themselves here.",
  "I need to rewatch this — I think I missed something.",
  "Hot take: this is the best nomination this festival.",
  "The score/soundtrack elevated it so much.",
  "Anyone else notice that plot hole?",
  "Completely overhyped in my opinion.",
  "This deserved a higher rating from the group.",
  "The acting was incredible, especially the lead.",
  "I went in blind and was blown away.",
  "Classic for a reason.",
  "The twist caught me completely off guard.",
  "This made me ugly cry and I'm not sorry.",
  "Would love to see more picks like this in future festivals.",
  "Masterclass in tension and suspense.",
];

const SPOILER_COMMENTS = [
  "That final scene where they reveal the truth... chills.",
  "I can't believe they killed off the main character like that.",
  "The twist ending completely recontextualizes the whole movie.",
  "When the door opens at the end... perfect storytelling.",
];

interface NominationInfo {
  nominationId: string;
  festivalId: string;
  tmdbId: number;
  movieTitle: string;
}

export async function populateDiscussions(
  clubId: string,
  members: CreatedUser[],
  nominationInfos: NominationInfo[]
): Promise<void> {
  let threadCount = 0;
  let commentCount = 0;

  for (const nom of nominationInfos) {
    const slug = nom.movieTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);

    const { data: thread } = await supabase
      .from("discussion_threads")
      .insert({
        club_id: clubId,
        author_id: randomFrom(members).id,
        title: nom.movieTitle,
        content: `Discussion thread for ${nom.movieTitle}`,
        thread_type: "movie",
        festival_id: nom.festivalId,
        tmdb_id: nom.tmdbId,
        auto_created: true,
        slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
      })
      .select("id")
      .single();

    if (!thread) continue;
    threadCount++;

    // 2-5 comments per thread
    const numComments = 2 + Math.floor(Math.random() * 4);
    const commenters = randomSubset(members, numComments, numComments);

    for (let i = 0; i < commenters.length; i++) {
      const isSpoiler = Math.random() < 0.15;
      const content = isSpoiler ? randomFrom(SPOILER_COMMENTS) : randomFrom(COMMENT_TEMPLATES);

      const { data: comment } = await supabase
        .from("discussion_comments")
        .insert({
          thread_id: thread.id,
          author_id: commenters[i].id,
          content,
          is_spoiler: isSpoiler,
        })
        .select("id")
        .single();

      if (comment) {
        commentCount++;
        // Some comments get upvotes
        if (Math.random() < 0.4) {
          const voters = randomSubset(members, 1, 3);
          for (const voter of voters) {
            await supabase.from("discussion_votes").insert({
              comment_id: comment.id,
              user_id: voter.id,
            });
          }
        }
      }
    }

    // Some threads get upvotes too
    if (Math.random() < 0.3) {
      const voters = randomSubset(members, 1, 4);
      for (const voter of voters) {
        await supabase.from("discussion_votes").insert({
          thread_id: thread.id,
          user_id: voter.id,
        });
      }
    }
  }

  console.log(`    Discussions: ${threadCount} threads, ${commentCount} comments`);
}

// ── Activity Log ─────────────────────────────────────────────────

export async function populateActivityLog(
  clubId: string,
  members: CreatedUser[],
  festivalData: Array<{ id: string; theme: string; date: Date }>,
  seasonStart: Date
): Promise<void> {
  let count = 0;

  // Member joined entries
  for (const member of members) {
    const joinDate = new Date(seasonStart.getTime() - Math.random() * 7 * 86400000);
    await supabase.from("activity_log").insert({
      club_id: clubId,
      user_id: member.id,
      action: "member_joined",
      created_at: joinDate.toISOString(),
    });
    count++;
  }

  // Festival lifecycle entries
  for (const festival of festivalData) {
    await supabase.from("activity_log").insert({
      club_id: clubId,
      user_id: members[0].id,
      action: "festival_started",
      details: { festival_id: festival.id, theme: festival.theme },
      created_at: festival.date.toISOString(),
    });
    count++;

    // Phase changes
    const phaseDate = new Date(festival.date.getTime() + 7 * 86400000);
    await supabase.from("activity_log").insert({
      club_id: clubId,
      user_id: members[0].id,
      action: "festival_phase_changed",
      details: { festival_id: festival.id, phase: "watch_rate" },
      created_at: phaseDate.toISOString(),
    });
    count++;

    const resultsRevealDate = new Date(festival.date.getTime() + 21 * 86400000);
    await supabase.from("activity_log").insert({
      club_id: clubId,
      user_id: members[0].id,
      action: "festival_results_revealed",
      details: { festival_id: festival.id },
      created_at: resultsRevealDate.toISOString(),
    });
    count++;
  }

  console.log(`    Activity log: ${count} entries`);
}

// ── Watch History ────────────────────────────────────────────────

export async function populateWatchHistory(
  members: CreatedUser[],
  movieTmdbIds: number[],
  watchDate: Date
): Promise<void> {
  let count = 0;

  for (const member of members) {
    for (const tmdbId of movieTmdbIds) {
      const { error } = await supabase.from("watch_history").upsert(
        {
          user_id: member.id,
          tmdb_id: tmdbId,
          first_watched_at: watchDate.toISOString(),
          watch_count: 1,
          contexts: {},
        },
        { onConflict: "user_id,tmdb_id" }
      );

      if (!error) count++;
    }
  }

  console.log(`    Watch history: ${count} entries`);
}

// ── Private Notes ────────────────────────────────────────────────

const NOTE_TEMPLATES = [
  "Great cinematography — Deakins-level stuff",
  "Didn't love the ending but solid overall",
  "Need to rewatch before rating",
  "This would be perfect for a heist theme",
  "Underrated gem, deserves more love",
  "The score was the real star here",
  "Reminded me of early Fincher",
  "Good pick but not a 10 for me",
  "Absolute masterpiece. Top 5 all time.",
  "Fun watch but forgettable",
  "The twist was predictable but well executed",
  "Perfect for a rainy Sunday afternoon",
  "Made me want to watch the director's other films",
  "Better than I expected based on the trailer",
  "Would nominate this in a heartbeat",
];

export async function populatePrivateNotes(
  members: CreatedUser[],
  movieTmdbIds: number[]
): Promise<void> {
  const count = 15 + Math.floor(Math.random() * 11); // 15-25
  let inserted = 0;

  for (let i = 0; i < count; i++) {
    const member = randomFrom(members);
    const tmdbId = randomFrom(movieTmdbIds);
    const note = randomFrom(NOTE_TEMPLATES);

    const { error } = await supabase.from("private_notes").insert({
      user_id: member.id,
      tmdb_id: tmdbId,
      note,
    });

    if (!error) inserted++;
  }

  console.log(`    Private notes: ${inserted}`);
}

// ── Club Resources ───────────────────────────────────────────────

export async function populateClubResources(clubId: string, producerId: string): Promise<void> {
  const resources = [
    {
      title: "Club Rules",
      resource_type: "text",
      content:
        "1. Rate all movies before the deadline\n2. No spoilers in chat — use discussion threads\n3. Be respectful of everyone's taste\n4. One nomination per festival\n5. Have fun!",
      description: "Our club guidelines",
      icon: "scroll",
      display_order: 0,
    },
    {
      title: "How Scoring Works",
      resource_type: "text",
      content:
        "Points are awarded based on placement each festival. Linear scoring: 1st place gets N points (where N = number of participants), 2nd gets N-1, etc. Season standings accumulate across all festivals.",
      description: "Scoring and standings explained",
      icon: "trophy",
      display_order: 1,
    },
    {
      title: "Movie Recommendations Spreadsheet",
      resource_type: "link",
      url: "https://example.com/recommendations",
      description: "Our shared movie recommendation tracker",
      icon: "link",
      display_order: 2,
    },
  ];

  for (const res of resources) {
    await supabase.from("club_resources").insert({
      club_id: clubId,
      created_by: producerId,
      ...res,
    });
  }

  console.log(`    Resources: ${resources.length}`);
}

// ── Stack Rankings ───────────────────────────────────────────────

export async function populateStackRankings(
  festivalNominationMap: Map<string, string[]>,
  members: CreatedUser[]
): Promise<void> {
  let count = 0;

  for (const [festivalId, nominationIds] of festivalNominationMap) {
    // ~50% of festivals get stack rankings
    if (Math.random() > 0.5) continue;

    // ~60% of members create rankings
    const rankers = members.filter(() => Math.random() < 0.6);

    for (const member of rankers) {
      const shuffled = [...nominationIds].sort(() => Math.random() - 0.5);

      await supabase.from("stack_rankings").insert({
        festival_id: festivalId,
        user_id: member.id,
        ranked_order: shuffled,
      });
      count++;
    }
  }

  console.log(`    Stack rankings: ${count}`);
}
