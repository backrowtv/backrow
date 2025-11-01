/**
 * Test Factory — User Creation
 *
 * Bulk create test users with auth + public.users profiles.
 */

import { supabase, ensureMovie } from "./client";

const DEFAULT_PASSWORD = "TestFactory123!";

export interface CreatedUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Create a single test user (auth + public.users).
 * Idempotent — skips if user already exists.
 */
export async function createUser(
  email: string,
  displayName: string,
  password: string = DEFAULT_PASSWORD
): Promise<CreatedUser> {
  // Check if user already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, email, displayName };
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (authError) {
    // If auth user exists but public.users doesn't, look up auth user
    if (authError.message.includes("already been registered")) {
      // Use getUserById after listing with filter, or try signing in to get the user
      const { data: listData } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const authUser = listData?.users?.find((u) => u.email === email);

      // If not found in first page, try a broader search
      if (!authUser) {
        // Try to find via raw SQL through the admin client
        const { data: authRow } = await supabase
          .rpc("get_auth_user_by_email", { target_email: email })
          .maybeSingle();

        if (!authRow || !(authRow as { id?: string }).id) {
          // Last resort: sign in to discover the user ID
          const tempClient = (await import("@supabase/supabase-js")).createClient(
            (await import("./client")).supabaseUrl,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          const { data: signInData } = await tempClient.auth.signInWithPassword({
            email,
            password,
          });
          if (signInData?.user) {
            await ensurePublicUser(signInData.user.id, email, displayName);
            return { id: signInData.user.id, email, displayName };
          }
        } else {
          const rowId = (authRow as { id: string }).id;
          await ensurePublicUser(rowId, email, displayName);
          return { id: rowId, email, displayName };
        }
      }

      if (authUser) {
        await ensurePublicUser(authUser!.id, email, displayName);
        return { id: authUser!.id, email, displayName };
      }
    }
    throw new Error(`Failed to create auth user ${email}: ${authError.message}`);
  }

  const userId = authData.user.id;
  await ensurePublicUser(userId, email, displayName);
  return { id: userId, email, displayName };
}

async function ensurePublicUser(userId: string, email: string, displayName: string) {
  const username = email.split("@")[0].replace(/[^a-z0-9]/gi, "");

  const { error } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      display_name: displayName,
      username: `${username}_${Date.now().toString(36)}`,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.warn(`Warning: Could not upsert public.users for ${email}: ${error.message}`);
  }
}

/**
 * Create N test users with sequential emails.
 * Format: test-001@backrow.test, test-002@backrow.test, etc.
 */
export async function createBulkUsers(
  count: number,
  prefix: string = "test"
): Promise<CreatedUser[]> {
  const users: CreatedUser[] = [];
  const pad = String(count).length;

  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(pad, "0");
    const email = `${prefix}-${num}@backrow.test`;
    const displayName = `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} User ${num}`;

    try {
      const user = await createUser(email, displayName);
      users.push(user);
      if (i % 10 === 0) {
        console.log(`  Created ${i}/${count} users...`);
      }
    } catch (err) {
      console.error(`Failed to create user ${email}:`, err);
    }
  }

  console.log(`Created ${users.length}/${count} users with prefix "${prefix}"`);
  return users;
}

// ── Matrix-specific profile enrichment ──────────────────────────

const MATRIX_AVATARS: Array<{
  icon: string;
  colorIndex: number;
  borderColorIndex: number | null;
}> = [
  { icon: "popcorn", colorIndex: 0, borderColorIndex: 6 }, // Red + Sky border
  { icon: "masks", colorIndex: 7, borderColorIndex: null }, // Blue
  { icon: "tickets", colorIndex: 1, borderColorIndex: 10 }, // Orange + Pink border
  { icon: "3d-glasses", colorIndex: 8, borderColorIndex: null }, // Purple
  { icon: "skull", colorIndex: 11, borderColorIndex: 17 }, // Crimson + Black border
  { icon: "oscar", colorIndex: 2, borderColorIndex: null }, // Gold
  { icon: "scenic-director", colorIndex: 5, borderColorIndex: 7 }, // Teal + Blue border
  { icon: "clapperboard", colorIndex: 9, borderColorIndex: null }, // Violet
  { icon: "film-reel", colorIndex: 6, borderColorIndex: 0 }, // Sky + Red border
  { icon: "megaphone", colorIndex: 10, borderColorIndex: null }, // Pink
];

const MATRIX_BIOS = [
  "Action junkie. If there are explosions, I'm there.",
  "Sci-fi enthusiast and horror skeptic.",
  "If it's black and white, I'm watching it.",
  "I cry at animated movies. No shame.",
  "Festival veteran — 10 seasons and counting.",
  "I watch the credits. Every. Single. Time.",
  "Tarantino is overrated. Fight me.",
  "Documentary nerd who secretly loves rom-coms.",
  "Will argue about cinematography at any hour.",
  "I rate on vibes, not logic.",
];

const GENRE_POOL = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Sci-Fi",
  "Thriller",
  "Romance",
  "Animation",
  "Documentary",
  "Mystery",
  "Fantasy",
  "Crime",
];

/**
 * Enrich matrix user profiles with avatars, bios, and genres.
 */
export async function enrichUserProfiles(users: CreatedUser[]): Promise<void> {
  for (let i = 0; i < users.length; i++) {
    const avatar = MATRIX_AVATARS[i % MATRIX_AVATARS.length];
    const bio = MATRIX_BIOS[i % MATRIX_BIOS.length];

    // Pick 2-4 random genres
    const shuffledGenres = [...GENRE_POOL].sort(() => Math.random() - 0.5);
    const genreCount = 2 + Math.floor(Math.random() * 3);
    const genres = shuffledGenres.slice(0, genreCount);

    const { error } = await supabase
      .from("users")
      .update({
        avatar_icon: avatar.icon,
        avatar_color_index: avatar.colorIndex,
        avatar_border_color_index: avatar.borderColorIndex,
        bio,
        favorite_genres: genres,
      })
      .eq("id", users[i].id);

    if (error) {
      console.warn(`Warning: Could not enrich profile for ${users[i].email}: ${error.message}`);
    }
  }
  console.log(`  Enriched ${users.length} user profiles`);
}

/**
 * Populate user-level extras: generic ratings, future nom lists, user favorites.
 */
export async function populateUserExtras(
  users: CreatedUser[],
  movies: Array<{ tmdbId: number; title: string; posterPath: string }>
): Promise<void> {
  for (const user of users) {
    // Generic ratings: each user rates 15-20 random movies
    const ratingCount = 15 + Math.floor(Math.random() * 6);
    const shuffled = [...movies].sort(() => Math.random() - 0.5);
    const moviesToRate = shuffled.slice(0, ratingCount);

    for (const movie of moviesToRate) {
      await ensureMovie(movie);

      const rating = Math.round((3 + Math.random() * 7) * 10) / 10; // 3.0-10.0
      await supabase.from("generic_ratings").upsert(
        {
          user_id: user.id,
          tmdb_id: movie.tmdbId,
          rating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,tmdb_id" }
      );
    }

    // Future nomination list: 3-8 movies per user
    const futureCount = 3 + Math.floor(Math.random() * 6);
    const futureMovies = shuffled.slice(ratingCount, ratingCount + futureCount);

    for (const movie of futureMovies) {
      await ensureMovie(movie);

      const notes = [
        "Would be perfect for a thriller theme",
        "Classic — everyone should see this",
        "Divisive pick, would spark good discussion",
        "Hidden gem, nobody will guess it's mine",
        null,
        null,
      ];
      const note = notes[Math.floor(Math.random() * notes.length)];

      const { error } = await supabase.from("future_nomination_list").insert({
        user_id: user.id,
        tmdb_id: movie.tmdbId,
        note,
      });
      if (error && !error.message.includes("duplicate")) {
        console.warn(`Warning: future nom insert failed: ${error.message}`);
      }
    }

    // User favorites: 2-4 entries
    const favCount = 2 + Math.floor(Math.random() * 3);
    const favMovies = shuffled.slice(
      ratingCount + futureCount,
      ratingCount + futureCount + favCount
    );

    for (let i = 0; i < favMovies.length; i++) {
      const movie = favMovies[i];
      const { error } = await supabase.from("user_favorites").insert({
        user_id: user.id,
        tmdb_id: movie.tmdbId,
        item_type: "movie",
        title: movie.title,
        image_path: movie.posterPath,
        sort_order: i,
        is_featured: i === 0,
      });
      if (error && !error.message.includes("duplicate")) {
        console.warn(`Warning: user favorite insert failed: ${error.message}`);
      }
    }
  }

  console.log(`  Populated extras for ${users.length} users (ratings, future noms, favorites)`);
}

/**
 * Get existing test users (the 4 hardcoded ones from TestAuthWidget)
 */
export async function getExistingTestUsers(): Promise<Record<string, CreatedUser>> {
  const emails = [
    "producer@test.backrow.tv",
    "director@test.backrow.tv",
    "critic@test.backrow.tv",
    "visitor@test.backrow.tv",
  ];

  const result: Record<string, CreatedUser> = {};

  for (const email of emails) {
    const { data } = await supabase
      .from("users")
      .select("id, email, display_name")
      .eq("email", email)
      .maybeSingle();

    if (data) {
      const role = email.split("@")[0]; // producer, director, critic, visitor
      result[role] = {
        id: data.id,
        email: data.email,
        displayName: data.display_name || role,
      };
    }
  }

  return result;
}
