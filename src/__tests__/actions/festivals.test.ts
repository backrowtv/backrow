/**
 * Festival Lifecycle Tests
 *
 * Tests phase management, lifecycle rules, and minimum participant validation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { adminClient, getUserId } from "../setup/supabase-test-client";

let producerId: string;
let directorId: string;
let criticId: string;
let testClubId: string;
let testSeasonId: string;

beforeAll(async () => {
  producerId = await getUserId("producer@test.backrow.tv");
  directorId = await getUserId("director@test.backrow.tv");
  criticId = await getUserId("critic@test.backrow.tv");

  const { data: club } = await adminClient
    .from("clubs")
    .insert({
      name: `Festival Test Club ${Date.now()}`,
      slug: `fest-test-${Date.now().toString(36)}`,
      producer_id: producerId,
      privacy: "private",
      settings: {},
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
      name: "Fest Lifecycle Season",
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    })
    .select("id")
    .single();
  testSeasonId = season!.id;
});

describe("festival creation", () => {
  it("creates a festival in nomination phase", async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const nomDeadline = new Date(now);
    nomDeadline.setDate(nomDeadline.getDate() + 7);

    const { data, error } = await adminClient
      .from("festivals")
      .insert({
        club_id: testClubId,
        season_id: testSeasonId,
        theme: "Action",
        slug: `fest-action-${Date.now().toString(36)}`,
        phase: "nomination",
        status: "nominating",
        start_date: start.toISOString(),
        nomination_deadline: nomDeadline.toISOString(),
        member_count_at_creation: 3,
      })
      .select("id, phase, status")
      .single();

    expect(error).toBeNull();
    expect(data!.phase).toBe("nomination");
    expect(data!.status).toBe("nominating");
  });

  it("creates festivals with valid status values", async () => {
    const validStatuses = ["idle", "nominating", "watching", "completed", "cancelled"];

    for (const status of validStatuses) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      const { data, error } = await adminClient
        .from("festivals")
        .insert({
          club_id: testClubId,
          season_id: testSeasonId,
          theme: `Status Test ${status}`,
          slug: `fest-${status}-${Date.now().toString(36)}`,
          phase:
            status === "watching"
              ? "watch_rate"
              : status === "completed"
                ? "results"
                : "nomination",
          status,
          start_date: start.toISOString(),
          member_count_at_creation: 3,
        })
        .select("id, status")
        .single();

      expect(error).toBeNull();
      expect(data!.status).toBe(status);
    }
  });

  it("rejects invalid status values", async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const { error } = await adminClient.from("festivals").insert({
      club_id: testClubId,
      season_id: testSeasonId,
      theme: "Bad Status",
      slug: `fest-bad-${Date.now().toString(36)}`,
      phase: "nomination",
      status: "invalid_status",
      start_date: start.toISOString(),
      member_count_at_creation: 3,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("festivals_status_check");
  });
});

describe("festival phase data", () => {
  it("festival_results stores JSONB correctly", async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const { data: fest } = await adminClient
      .from("festivals")
      .insert({
        club_id: testClubId,
        season_id: testSeasonId,
        theme: "Results Test",
        slug: `fest-results-${Date.now().toString(36)}`,
        phase: "results",
        status: "completed",
        start_date: start.toISOString(),
        member_count_at_creation: 3,
      })
      .select("id")
      .single();

    const testResults = {
      nominations: [{ nomination_id: "test", average_rating: 7.5, placement: 1 }],
      standings: [{ user_id: producerId, rank: 1, points: 3 }],
      calculated_at: new Date().toISOString(),
    };

    const { error: resError } = await adminClient.from("festival_results").upsert(
      {
        festival_id: fest!.id,
        results: testResults,
        calculated_at: new Date().toISOString(),
        is_final: true,
      },
      { onConflict: "festival_id" }
    );

    expect(resError).toBeNull();

    // Read back and verify
    const { data: stored } = await adminClient
      .from("festival_results")
      .select("results, is_final")
      .eq("festival_id", fest!.id)
      .single();

    expect(stored!.is_final).toBe(true);
    expect((stored!.results as Record<string, unknown>).standings).toBeDefined();
  });
});

describe("festival standings", () => {
  it("stores standings with correct rank and points", async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const { data: fest } = await adminClient
      .from("festivals")
      .insert({
        club_id: testClubId,
        season_id: testSeasonId,
        theme: "Standings Test",
        slug: `fest-stand-${Date.now().toString(36)}`,
        phase: "results",
        status: "completed",
        start_date: start.toISOString(),
        member_count_at_creation: 3,
      })
      .select("id")
      .single();

    await adminClient.from("festival_standings").insert([
      {
        festival_id: fest!.id,
        user_id: producerId,
        rank: 1,
        points: 3,
        average_rating: 8.0,
        ratings_count: 2,
        nominations_count: 1,
      },
      {
        festival_id: fest!.id,
        user_id: directorId,
        rank: 2,
        points: 2,
        average_rating: 7.0,
        ratings_count: 2,
        nominations_count: 1,
      },
      {
        festival_id: fest!.id,
        user_id: criticId,
        rank: 3,
        points: 1,
        average_rating: 6.0,
        ratings_count: 2,
        nominations_count: 1,
      },
    ]);

    const { data: standings } = await adminClient
      .from("festival_standings")
      .select("*")
      .eq("festival_id", fest!.id)
      .order("rank");

    expect(standings).toHaveLength(3);
    expect(standings![0].rank).toBe(1);
    expect(standings![0].points).toBe(3);
    expect(standings![2].rank).toBe(3);
    expect(standings![2].points).toBe(1);
  });
});
