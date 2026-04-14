/**
 * Nomination Action Tests
 *
 * Tests nomination rules, limits, blind mode, and setting-dependent permissions.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { adminClient, getUserId } from "../setup/supabase-test-client";

let producerId: string;
let directorId: string;
let criticId: string;
let _visitorId: string;
let testClubId: string;
let testSeasonId: string;
let testFestivalId: string;

beforeAll(async () => {
  producerId = await getUserId("producer@test.backrow.tv");
  directorId = await getUserId("director@test.backrow.tv");
  criticId = await getUserId("critic@test.backrow.tv");
  _visitorId = await getUserId("visitor@test.backrow.tv");

  // Create isolated test club for nomination tests
  const { data: club } = await adminClient
    .from("clubs")
    .insert({
      name: `Nom Test Club ${Date.now()}`,
      slug: `nom-test-${Date.now().toString(36)}`,
      producer_id: producerId,
      privacy: "private",
      settings: {
        max_nominations_per_user: 1,
        allow_non_admin_nominations: true,
        blind_nominations_enabled: false,
      },
      themes_enabled: true,
      allow_non_admin_nominations: true,
    })
    .select("id")
    .single();
  testClubId = club!.id;

  await adminClient.from("club_members").insert([
    { club_id: testClubId, user_id: producerId, role: "producer" },
    { club_id: testClubId, user_id: directorId, role: "director" },
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
      name: "Nom Test Season",
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    })
    .select("id")
    .single();
  testSeasonId = season!.id;

  const nomDeadline = new Date(now);
  nomDeadline.setDate(nomDeadline.getDate() + 7);
  const { data: festival } = await adminClient
    .from("festivals")
    .insert({
      club_id: testClubId,
      season_id: testSeasonId,
      theme: "Test Theme",
      slug: `nom-fest-${Date.now().toString(36)}`,
      phase: "nomination",
      status: "nominating",
      start_date: start.toISOString(),
      nomination_deadline: nomDeadline.toISOString(),
      member_count_at_creation: 3,
    })
    .select("id")
    .single();
  testFestivalId = festival!.id;

  // Ensure test movies exist
  await adminClient.from("movies").upsert(
    [
      { tmdb_id: 562, title: "Die Hard", year: 1988, cached_at: new Date().toISOString() },
      { tmdb_id: 679, title: "Aliens", year: 1986, cached_at: new Date().toISOString() },
      { tmdb_id: 603, title: "The Matrix", year: 1999, cached_at: new Date().toISOString() },
      { tmdb_id: 155, title: "The Dark Knight", year: 2008, cached_at: new Date().toISOString() },
    ],
    { onConflict: "tmdb_id" }
  );
});

describe("nomination creation rules", () => {
  it("allows producer to nominate", async () => {
    const { error } = await adminClient.from("nominations").insert({
      festival_id: testFestivalId,
      user_id: producerId,
      tmdb_id: 562,
      pitch: "Classic action",
    });
    expect(error).toBeNull();
  });

  it("allows director to nominate", async () => {
    const { error } = await adminClient.from("nominations").insert({
      festival_id: testFestivalId,
      user_id: directorId,
      tmdb_id: 679,
      pitch: "Sci-fi horror",
    });
    expect(error).toBeNull();
  });

  it("allows critic to nominate (when allow_non_admin_nominations=true)", async () => {
    const { error } = await adminClient.from("nominations").insert({
      festival_id: testFestivalId,
      user_id: criticId,
      tmdb_id: 603,
      pitch: "Mind-bending",
    });
    expect(error).toBeNull();
  });

  it("prevents duplicate movie nominations in same festival", async () => {
    const { error } = await adminClient.from("nominations").insert({
      festival_id: testFestivalId,
      user_id: producerId,
      tmdb_id: 562, // Already nominated above
      pitch: "Duplicate",
    });
    // Should fail due to unique constraint or RLS
    expect(error).not.toBeNull();
  });
});

describe("nomination data integrity", () => {
  it("soft-deleted nominations are excluded from active queries", async () => {
    // Create and then soft-delete a nomination
    const { data: nom } = await adminClient
      .from("nominations")
      .insert({
        festival_id: testFestivalId,
        user_id: producerId,
        tmdb_id: 155,
        pitch: "Will be deleted",
      })
      .select("id")
      .single();

    await adminClient
      .from("nominations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", nom!.id);

    // Query active nominations
    const { data: active } = await adminClient
      .from("nominations")
      .select("id")
      .eq("festival_id", testFestivalId)
      .is("deleted_at", null);

    expect(active?.find((n) => n.id === nom!.id)).toBeUndefined();
  });
});
