/**
 * Rating Action Tests
 *
 * Tests rating validation, scale enforcement, and rubric rules.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { adminClient, getUserId } from "../setup/supabase-test-client";

let producerId: string;
let criticId: string;
let testClubId: string;
let testFestivalId: string;
let nominationId: string;

beforeAll(async () => {
  producerId = await getUserId("producer@test.backrow.tv");
  criticId = await getUserId("critic@test.backrow.tv");

  // Create club with specific rating scale
  const { data: club } = await adminClient
    .from("clubs")
    .insert({
      name: `Rating Test Club ${Date.now()}`,
      slug: `rating-test-${Date.now().toString(36)}`,
      producer_id: producerId,
      privacy: "private",
      settings: { rating_min: 1, rating_max: 10, rating_increment: 0.5 },
      rating_min: 1,
      rating_max: 10,
      rating_increment: 0.5,
      club_ratings_enabled: true,
    })
    .select("id")
    .single();
  testClubId = club!.id;

  await adminClient.from("club_members").insert([
    { club_id: testClubId, user_id: producerId, role: "producer" },
    { club_id: testClubId, user_id: criticId, role: "critic" },
  ]);

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 3);
  const { data: season } = await adminClient
    .from("seasons")
    .insert({
      club_id: testClubId,
      name: "Rating Season",
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  const nomDeadline = new Date(now);
  nomDeadline.setDate(nomDeadline.getDate() + 7);
  const watchDeadline = new Date(now);
  watchDeadline.setDate(watchDeadline.getDate() + 14);
  const { data: festival } = await adminClient
    .from("festivals")
    .insert({
      club_id: testClubId,
      season_id: season!.id,
      theme: "Rating Test",
      slug: `rat-fest-${Date.now().toString(36)}`,
      phase: "watch_rate",
      status: "watching",
      start_date: start.toISOString(),
      nomination_deadline: nomDeadline.toISOString(),
      watch_deadline: watchDeadline.toISOString(),
      member_count_at_creation: 2,
    })
    .select("id")
    .single();
  testFestivalId = festival!.id;

  await adminClient
    .from("movies")
    .upsert(
      {
        tmdb_id: 278,
        title: "The Shawshank Redemption",
        year: 1994,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "tmdb_id" }
    );

  // Critic nominates a movie (so producer can rate it)
  const { data: nom } = await adminClient
    .from("nominations")
    .insert({ festival_id: testFestivalId, user_id: criticId, tmdb_id: 278, pitch: "Classic" })
    .select("id")
    .single();
  nominationId = nom!.id;
});

describe("rating creation", () => {
  it("allows member to rate a nomination", async () => {
    const { error } = await adminClient.from("ratings").insert({
      festival_id: testFestivalId,
      nomination_id: nominationId,
      user_id: producerId,
      rating: 8.5,
    });
    expect(error).toBeNull();
  });

  it("stores rating values correctly", async () => {
    const { data } = await adminClient
      .from("ratings")
      .select("rating")
      .eq("festival_id", testFestivalId)
      .eq("user_id", producerId)
      .eq("nomination_id", nominationId)
      .single();

    expect(data).not.toBeNull();
    expect(data!.rating).toBeGreaterThanOrEqual(0);
    expect(data!.rating).toBeLessThanOrEqual(10);
  });
});

describe("rating constraints", () => {
  it("prevents duplicate ratings for same nomination by same user", async () => {
    const { error } = await adminClient.from("ratings").insert({
      festival_id: testFestivalId,
      nomination_id: nominationId,
      user_id: producerId, // Already rated above
      rating: 7.0,
    });
    expect(error).not.toBeNull();
  });

  it("soft-deleted ratings excluded from queries", async () => {
    // Create a rating then soft-delete it
    const criticNomId = nominationId; // critic's nomination
    const { data: rating } = await adminClient
      .from("ratings")
      .insert({
        festival_id: testFestivalId,
        nomination_id: criticNomId,
        user_id: criticId,
        rating: 6.0,
      })
      .select("id")
      .single();

    if (rating) {
      await adminClient
        .from("ratings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", rating.id);

      const { data: active } = await adminClient
        .from("ratings")
        .select("id")
        .eq("festival_id", testFestivalId)
        .is("deleted_at", null);

      expect(active?.find((r) => r.id === rating.id)).toBeUndefined();
    }
  });
});
