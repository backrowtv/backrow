/**
 * Test Factory — Pre-built Scenarios
 *
 * Ready-to-use data scenarios at different scales.
 */

import { createBulkUsers, enrichUserProfiles, populateUserExtras, type CreatedUser } from "./users";
import { createClub, createPresetClub, addMembers, createSeason, PRESET_SETTINGS } from "./clubs";
import { createFestival, type FestivalPhase } from "./festivals";
import { getAllMovies } from "./movies";
import {
  populateThemePool,
  populateMoviePool,
  populateEvents,
  populateAnnouncements,
  populatePolls,
  populateChatMessages,
  populateDiscussions,
  populateActivityLog,
  populateWatchHistory,
  populatePrivateNotes,
  populateClubResources,
  populateStackRankings,
} from "./ambient";
import { supabase } from "./client";

export interface ScenarioResult {
  name: string;
  clubs: { id: string; slug: string; name: string }[];
  users: CreatedUser[];
}

/**
 * Tiny club: 2-3 members, 1 active festival.
 * Edge case: near-minimum viable club.
 */
export async function createTinyScenario(): Promise<ScenarioResult> {
  console.log("\n--- Creating TINY scenario (2-3 members) ---");
  const users = await createBulkUsers(3, "tiny");
  const owner = users[0];

  const club = await createClub({
    name: "Tiny Club",
    ownerId: owner.id,
    settings: PRESET_SETTINGS.standard_competitive,
    festivalType: "standard",
  });

  await addMembers(club.id, [
    { userId: users[1].id, role: "critic" },
    { userId: users[2].id, role: "critic" },
  ]);

  const seasonId = await createSeason(club.id);
  await createFestival({
    clubId: club.id,
    seasonId,
    theme: "Tiny but Mighty",
    phase: "nomination",
    members: users,
  });

  console.log(`  Club: ${club.name} (${club.slug})`);
  return { name: "tiny", clubs: [club], users };
}

/**
 * Small club: 5 members, 2 festivals (1 active, 1 completed).
 */
export async function createSmallScenario(): Promise<ScenarioResult> {
  console.log("\n--- Creating SMALL scenario (5 members) ---");
  const users = await createBulkUsers(5, "small");
  const owner = users[0];

  const club = await createClub({
    name: "Small Club",
    ownerId: owner.id,
    settings: PRESET_SETTINGS.standard_competitive,
    festivalType: "standard",
  });

  await addMembers(club.id, [
    { userId: users[1].id, role: "director" },
    { userId: users[2].id, role: "critic" },
    { userId: users[3].id, role: "critic" },
    { userId: users[4].id, role: "critic" },
  ]);

  const seasonId = await createSeason(club.id);

  // Completed festival
  await createFestival({
    clubId: club.id,
    seasonId,
    theme: "80s Sci-Fi",
    phase: "results",
    members: users,
  });

  // Active festival
  await createFestival({
    clubId: club.id,
    seasonId,
    theme: "Heist Movies",
    phase: "watch_rate",
    members: users,
  });

  console.log(`  Club: ${club.name} (${club.slug})`);
  return { name: "small", clubs: [club], users };
}

/**
 * Medium club: 10-15 members, 5 festivals across phases.
 */
export async function createMediumScenario(): Promise<ScenarioResult> {
  console.log("\n--- Creating MEDIUM scenario (15 members) ---");
  const users = await createBulkUsers(15, "medium");
  const owner = users[0];

  const club = await createClub({
    name: "Medium Club",
    ownerId: owner.id,
    settings: PRESET_SETTINGS.standard_competitive,
    festivalType: "standard",
  });

  await addMembers(club.id, [
    { userId: users[1].id, role: "director" },
    { userId: users[2].id, role: "director" },
    ...users.slice(3).map((u) => ({ userId: u.id, role: "critic" as const })),
  ]);

  const seasonId = await createSeason(club.id);
  const phases: Array<{
    theme: string;
    phase: "theme_selection" | "nomination" | "watch_rate" | "results";
  }> = [
    { theme: "Film Noir", phase: "results" },
    { theme: "Space Adventures", phase: "results" },
    { theme: "Coming of Age", phase: "results" },
    { theme: "Psychological Thrillers", phase: "watch_rate" },
    { theme: "Road Trip Movies", phase: "nomination" },
  ];

  for (const { theme, phase } of phases) {
    await createFestival({
      clubId: club.id,
      seasonId,
      theme,
      phase,
      members: users,
    });
  }

  console.log(`  Club: ${club.name} (${club.slug})`);
  return { name: "medium", clubs: [club], users };
}

/**
 * Active club: 25 members, 8 festivals with rich activity.
 */
export async function createActiveScenario(): Promise<ScenarioResult> {
  console.log("\n--- Creating ACTIVE scenario (25 members) ---");
  const users = await createBulkUsers(25, "active");
  const owner = users[0];

  const club = await createClub({
    name: "Active Club",
    ownerId: owner.id,
    settings: PRESET_SETTINGS.standard_competitive,
    festivalType: "standard",
  });

  await addMembers(club.id, [
    { userId: users[1].id, role: "director" },
    { userId: users[2].id, role: "director" },
    ...users.slice(3).map((u) => ({ userId: u.id, role: "critic" as const })),
  ]);

  const seasonId = await createSeason(club.id);

  // 6 completed + 1 watching + 1 nominating
  const festivals = [
    { theme: "Revenge Plots", phase: "results" as const },
    { theme: "Time Travel", phase: "results" as const },
    { theme: "Buddy Cops", phase: "results" as const },
    { theme: "Survival Horror", phase: "results" as const },
    { theme: "War Epics", phase: "results" as const },
    { theme: "Mind Benders", phase: "results" as const },
    { theme: "Monster Movies", phase: "watch_rate" as const },
    { theme: "Dystopian Futures", phase: "nomination" as const },
  ];

  for (const f of festivals) {
    await createFestival({
      clubId: club.id,
      seasonId,
      theme: f.theme,
      phase: f.phase,
      members: users,
    });
  }

  console.log(`  Club: ${club.name} (${club.slug})`);
  return { name: "active", clubs: [club], users };
}

/**
 * Large club: 50 members, 15+ festivals — scale stress test.
 */
export async function createLargeScenario(): Promise<ScenarioResult> {
  console.log("\n--- Creating LARGE scenario (50 members) ---");
  const users = await createBulkUsers(50, "large");
  const owner = users[0];

  const club = await createClub({
    name: "Large Club",
    ownerId: owner.id,
    settings: PRESET_SETTINGS.standard_competitive,
    festivalType: "standard",
  });

  await addMembers(club.id, [
    { userId: users[1].id, role: "director" },
    { userId: users[2].id, role: "director" },
    { userId: users[3].id, role: "director" },
    ...users.slice(4).map((u) => ({ userId: u.id, role: "critic" as const })),
  ]);

  const seasonId = await createSeason(club.id);

  // 13 completed + 1 watching + 1 nominating
  const themes = [
    "Golden Age Hollywood",
    "French New Wave",
    "Wuxia",
    "Anime Classics",
    "Spaghetti Western",
    "British Comedy",
    "Scandinavian Noir",
    "Bollywood Hits",
    "Korean Thrillers",
    "Japanese Horror",
    "Australian Cinema",
    "Italian Neorealism",
    "German Expressionism",
  ];

  for (const theme of themes) {
    await createFestival({
      clubId: club.id,
      seasonId,
      theme,
      phase: "results",
      members: users.slice(0, 20), // Use subset for perf (20 participants per festival)
    });
  }

  // Active festivals with full membership
  await createFestival({
    clubId: club.id,
    seasonId,
    theme: "Modern Masterpieces",
    phase: "watch_rate",
    members: users.slice(0, 30),
  });

  await createFestival({
    clubId: club.id,
    seasonId,
    theme: "Directors We Love",
    phase: "nomination",
    members: users.slice(0, 30),
  });

  console.log(`  Club: ${club.name} (${club.slug})`);
  return { name: "large", clubs: [club], users };
}

/**
 * Presets scenario: 3 clubs (endless, standard_competitive, standard_casual), 10 members each.
 */
export async function createPresetsScenario(): Promise<ScenarioResult> {
  console.log("\n--- Creating PRESETS scenario (3 clubs x 10 members) ---");
  const users = await createBulkUsers(10, "preset");
  const owner = users[0];

  const clubs = [];

  for (const preset of ["endless", "standard_competitive", "standard_casual"] as const) {
    const club = await createPresetClub(preset, owner.id);
    await addMembers(
      club.id,
      users.slice(1).map((u) => ({ userId: u.id, role: "critic" as const }))
    );

    const seasonId = await createSeason(club.id);

    if (preset === "endless") {
      // Endless: just create the festival shell (no phases)
      await createFestival({
        clubId: club.id,
        seasonId,
        theme: "Casual Watch",
        phase: "watch_rate",
        members: users,
        ratingMin: 1,
        ratingMax: 5,
        ratingIncrement: 1,
      });
    } else {
      // Standard: active festival at watch_rate + 1 completed
      await createFestival({
        clubId: club.id,
        seasonId,
        theme: `${preset} Completed`,
        phase: "results",
        members: users,
        ratingMin: 1,
        ratingMax: 10,
        ratingIncrement: 0.5,
      });
      await createFestival({
        clubId: club.id,
        seasonId,
        theme: `${preset} Active`,
        phase: "watch_rate",
        members: users,
        ratingMin: 1,
        ratingMax: 10,
        ratingIncrement: 0.5,
      });
    }

    clubs.push(club);
    console.log(`  ${preset}: ${club.name} (${club.slug})`);
  }

  return { name: "presets", clubs, users };
}

/**
 * Matrix scenario: 4 clubs x 10 users x 11 festivals each.
 * A full year's worth of realistic data for UI auditing.
 *
 * - Matrix Alpha: 10 completed + 1 in theme_selection
 * - Matrix Beta:  10 completed + 1 in nomination
 * - Matrix Gamma: 10 completed + 1 in watch_rate (partial ratings)
 * - Matrix Delta: 11 completed (all finished)
 */
export async function createMatrixScenario(): Promise<ScenarioResult> {
  console.log("\n--- Creating MATRIX scenario (4 clubs x 10 users x 11 festivals) ---");

  const allMovies = getAllMovies();

  // 1. Create 10 shared users
  const users = await createBulkUsers(10, "matrix");
  const owner = users[0];

  // 2. Enrich profiles
  console.log("  Enriching user profiles...");
  await enrichUserProfiles(users);

  // 3. Populate user-level extras
  console.log("  Populating user extras...");
  await populateUserExtras(users, allMovies);

  // 4. Club configs
  const clubConfigs: Array<{
    name: string;
    activePhase: FestivalPhase;
    activeTheme: string | null;
  }> = [
    { name: "Matrix Alpha", activePhase: "theme_selection", activeTheme: null },
    { name: "Matrix Beta", activePhase: "nomination", activeTheme: "Directors We Love" },
    { name: "Matrix Gamma", activePhase: "watch_rate", activeTheme: "Hidden Gems" },
    { name: "Matrix Delta", activePhase: "results", activeTheme: "Season Finale" },
  ];

  const COMPLETED_THEMES = [
    "Action Classics",
    "Sci-Fi Epics",
    "Film Noir",
    "Heist Movies",
    "Psychological Thrillers",
    "War Films",
    "Revenge Plots",
    "Time Travel",
    "Coming of Age",
    "Monster Movies",
  ];

  const seasonStart = new Date("2025-04-01");
  const seasonEnd = new Date("2026-04-01");

  const clubs: Array<{ id: string; slug: string; name: string }> = [];

  for (const config of clubConfigs) {
    console.log(`\n  Creating club: ${config.name} (active: ${config.activePhase})`);

    // Create club
    const club = await createClub({
      name: config.name,
      ownerId: owner.id,
      settings: PRESET_SETTINGS.standard_competitive,
      festivalType: "standard",
    });

    // Add members
    await addMembers(club.id, [
      { userId: users[1].id, role: "director" },
      ...users.slice(2).map((u) => ({ userId: u.id, role: "critic" as const })),
    ]);

    // Create year-spanning season
    const seasonId = await createSeason(club.id, "Season 2025-2026", {
      startDate: "2025-04-01",
      endDate: "2026-04-01",
    });

    // Track data for ambient population
    const festivalData: Array<{ id: string; theme: string; date: Date }> = [];
    const allNominationInfos: Array<{
      nominationId: string;
      festivalId: string;
      tmdbId: number;
      movieTitle: string;
    }> = [];
    const allMovieTmdbIds: number[] = [];
    const festivalNominationMap = new Map<string, string[]>();

    // ── 10 Completed Festivals ──
    console.log("    Creating 10 completed festivals...");

    for (let i = 0; i < 10; i++) {
      const monthOffset = i; // Apr=0, May=1, ... Jan=9
      const festStart = new Date(2025, 3 + monthOffset, 1);
      const nomDeadline = new Date(2025, 3 + monthOffset, 8);
      const watchDeadline = new Date(2025, 3 + monthOffset, 22);
      const resultsDate = new Date(2025, 3 + monthOffset, 25);

      const festival = await createFestival({
        clubId: club.id,
        seasonId,
        theme: COMPLETED_THEMES[i],
        phase: "results",
        members: users,
        moviePool: allMovies,
        populateGuesses: true,
        dates: {
          startDate: festStart,
          nominationDeadline: nomDeadline,
          watchDeadline,
          resultsDate,
          createdAt: festStart,
        },
      });

      festivalData.push({ id: festival.id, theme: COMPLETED_THEMES[i], date: festStart });

      // Collect nomination info for discussions
      const { data: noms } = await supabase
        .from("nominations")
        .select("id, tmdb_id, movies:tmdb_id(title)")
        .eq("festival_id", festival.id)
        .is("deleted_at", null);

      const nomIds: string[] = [];
      if (noms) {
        for (const nom of noms) {
          const moviesRel = Array.isArray(nom.movies) ? nom.movies[0] : nom.movies;
          const title = (moviesRel as { title?: string } | null)?.title || "Unknown";
          allNominationInfos.push({
            nominationId: nom.id,
            festivalId: festival.id,
            tmdbId: nom.tmdb_id,
            movieTitle: title,
          });
          allMovieTmdbIds.push(nom.tmdb_id);
          nomIds.push(nom.id);
        }
      }
      festivalNominationMap.set(festival.id, nomIds);

      if ((i + 1) % 5 === 0) {
        console.log(`      ${i + 1}/10 completed`);
      }
    }

    // ── Active Festival ──
    console.log(`    Creating active festival (${config.activePhase})...`);
    const activeStart = new Date("2026-02-01");

    const activeFestival = await createFestival({
      clubId: club.id,
      seasonId,
      theme: config.activeTheme,
      phase: config.activePhase,
      members: users,
      moviePool: allMovies,
      populateGuesses: config.activePhase === "watch_rate",
      ratingParticipation: config.activePhase === "watch_rate" ? 0.6 : 1.0,
      dates: {
        startDate: activeStart,
        nominationDeadline: new Date("2026-02-08"),
        watchDeadline: new Date("2026-02-22"),
        resultsDate: config.activePhase === "results" ? new Date("2026-02-25") : undefined,
        createdAt: activeStart,
      },
    });

    if (config.activePhase === "results") {
      festivalData.push({
        id: activeFestival.id,
        theme: config.activeTheme || "Season Finale",
        date: activeStart,
      });
    }

    // ── Ambient Data ──
    console.log("    Populating ambient data...");

    await populateThemePool(club.id, users, COMPLETED_THEMES);
    await populateMoviePool(club.id, users, allMovies);
    await populateEvents(club.id, users, seasonStart, seasonEnd);
    await populateAnnouncements(club.id, owner.id, seasonStart, seasonEnd);
    await populatePolls(club.id, users, seasonStart, seasonEnd);
    await populateChatMessages(club.id, users, seasonStart, seasonEnd);
    await populateDiscussions(club.id, users, allNominationInfos);
    await populateActivityLog(club.id, users, festivalData, seasonStart);

    const uniqueTmdbIds = [...new Set(allMovieTmdbIds)];
    await populateWatchHistory(users, uniqueTmdbIds, new Date("2025-06-15"));
    await populatePrivateNotes(users, uniqueTmdbIds);
    await populateClubResources(club.id, owner.id);
    await populateStackRankings(festivalNominationMap, users);

    clubs.push(club);
    console.log(`  Done: ${club.name} (${club.slug})`);
  }

  console.log("\n--- MATRIX SCENARIO COMPLETE ---");
  console.log(`  ${clubs.length} clubs, ${users.length} users`);
  console.log(`  Login: matrix-01@backrow.test / TestFactory123!`);

  return { name: "matrix", clubs, users };
}

/**
 * Run all scenarios.
 */
export async function createAllScenarios(): Promise<ScenarioResult[]> {
  console.log("=== CREATING ALL SCENARIOS ===\n");

  const results = [];
  results.push(await createTinyScenario());
  results.push(await createSmallScenario());
  results.push(await createMediumScenario());
  results.push(await createActiveScenario());
  results.push(await createLargeScenario());
  results.push(await createPresetsScenario());

  console.log("\n=== ALL SCENARIOS COMPLETE ===");
  console.log(`Total clubs: ${results.reduce((s, r) => s + r.clubs.length, 0)}`);
  console.log(`Total users: ${results.reduce((s, r) => s + r.users.length, 0)}`);

  return results;
}
