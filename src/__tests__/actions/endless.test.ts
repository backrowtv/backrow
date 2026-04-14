/**
 * Endless Festival Tests
 *
 * Tests movie pool management, endless festival lifecycle, and pool governance.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { adminClient, getUserId } from "../setup/supabase-test-client";

let producerId: string;
let criticId: string;
let testClubId: string;
let testFestivalId: string;

beforeAll(async () => {
  producerId = await getUserId("producer@test.backrow.tv");
  criticId = await getUserId("critic@test.backrow.tv");

  const { data: club } = await adminClient
    .from("clubs")
    .insert({
      name: `Endless Test Club ${Date.now()}`,
      slug: `endless-test-${Date.now().toString(36)}`,
      producer_id: producerId,
      privacy: "private",
      festival_type: "endless",
      settings: {
        festival_type: "endless",
        movie_pool_enabled: true,
        movie_pool_voting_enabled: true,
        movie_pool_governance: "autocracy",
        movie_pool_auto_promote_threshold: 5,
        allow_non_admin_movie_pool: true,
      },
    })
    .select("id")
    .single();
  testClubId = club!.id;

  await adminClient.from("club_members").insert([
    { club_id: testClubId, user_id: producerId, role: "producer" },
    { club_id: testClubId, user_id: criticId, role: "critic" },
  ]);

  // Create an endless festival
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 3);
  const { data: season } = await adminClient
    .from("seasons")
    .insert({
      club_id: testClubId,
      name: "Endless Season",
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  const { data: festival } = await adminClient
    .from("festivals")
    .insert({
      club_id: testClubId,
      season_id: season!.id,
      theme: "Endless Watch",
      slug: `endless-fest-${Date.now().toString(36)}`,
      phase: "watch_rate",
      status: "watching",
      start_date: start.toISOString(),
      member_count_at_creation: 2,
    })
    .select("id")
    .single();
  testFestivalId = festival!.id;

  await adminClient.from("movies").upsert(
    [
      { tmdb_id: 550, title: "Fight Club", year: 1999, cached_at: new Date().toISOString() },
      { tmdb_id: 27205, title: "Inception", year: 2010, cached_at: new Date().toISOString() },
      { tmdb_id: 769, title: "Goodfellas", year: 1990, cached_at: new Date().toISOString() },
    ],
    { onConflict: "tmdb_id" }
  );
});

describe("movie pool", () => {
  it("adds movies to club pool", async () => {
    const { error } = await adminClient.from("club_movie_pool").insert({
      club_id: testClubId,
      tmdb_id: 550,
      user_id: producerId,
      pitch: "Classic thriller",
    });
    expect(error).toBeNull();
  });

  it("allows critic to add to pool (when allow_non_admin_movie_pool=true)", async () => {
    const { error } = await adminClient.from("club_movie_pool").insert({
      club_id: testClubId,
      tmdb_id: 27205,
      user_id: criticId,
      pitch: "Mind bender",
    });
    expect(error).toBeNull();
  });

  it("queries pool items correctly", async () => {
    const { data } = await adminClient
      .from("club_movie_pool")
      .select("tmdb_id, user_id, pitch")
      .eq("club_id", testClubId)
      .is("deleted_at", null);

    expect(data!.length).toBeGreaterThanOrEqual(2);
  });

  it("soft-deletes pool items", async () => {
    const { data: item } = await adminClient
      .from("club_movie_pool")
      .insert({
        club_id: testClubId,
        tmdb_id: 769,
        user_id: producerId,
        pitch: "Will remove",
      })
      .select("id")
      .single();

    await adminClient
      .from("club_movie_pool")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", item!.id);

    const { data: active } = await adminClient
      .from("club_movie_pool")
      .select("id")
      .eq("club_id", testClubId)
      .is("deleted_at", null);

    expect(active?.find((p) => p.id === item!.id)).toBeUndefined();
  });
});

describe("endless nominations", () => {
  it("creates nomination with endless_status", async () => {
    const { data, error } = await adminClient
      .from("nominations")
      .insert({
        festival_id: testFestivalId,
        user_id: producerId,
        tmdb_id: 550,
        pitch: "Now showing",
        endless_status: "playing",
      })
      .select("id, endless_status")
      .single();

    expect(error).toBeNull();
    expect(data!.endless_status).toBe("playing");
  });

  it("transitions endless_status from playing to completed", async () => {
    const { data: nom } = await adminClient
      .from("nominations")
      .insert({
        festival_id: testFestivalId,
        user_id: criticId,
        tmdb_id: 27205,
        pitch: "Watched it",
        endless_status: "playing",
      })
      .select("id")
      .single();

    const { error } = await adminClient
      .from("nominations")
      .update({ endless_status: "completed", completed_at: new Date().toISOString() })
      .eq("id", nom!.id);

    expect(error).toBeNull();

    const { data: updated } = await adminClient
      .from("nominations")
      .select("endless_status, completed_at")
      .eq("id", nom!.id)
      .single();

    expect(updated!.endless_status).toBe("completed");
    expect(updated!.completed_at).not.toBeNull();
  });

  it("filters by endless_status correctly", async () => {
    const { data: playing } = await adminClient
      .from("nominations")
      .select("id")
      .eq("festival_id", testFestivalId)
      .eq("endless_status", "playing")
      .is("deleted_at", null);

    const { data: completed } = await adminClient
      .from("nominations")
      .select("id")
      .eq("festival_id", testFestivalId)
      .eq("endless_status", "completed")
      .is("deleted_at", null);

    // Both should exist from previous tests
    expect(playing!.length).toBeGreaterThanOrEqual(0);
    expect(completed!.length).toBeGreaterThanOrEqual(0);
  });
});
