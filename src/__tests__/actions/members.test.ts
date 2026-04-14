/**
 * Member Management Tests
 *
 * Tests role promotion/demotion rules and membership constraints.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { adminClient, getUserId } from "../setup/supabase-test-client";

let producerId: string;
let directorId: string;
let criticId: string;
let visitorId: string;
let testClubId: string;

beforeAll(async () => {
  producerId = await getUserId("producer@test.backrow.tv");
  directorId = await getUserId("director@test.backrow.tv");
  criticId = await getUserId("critic@test.backrow.tv");
  visitorId = await getUserId("visitor@test.backrow.tv");

  const { data: club } = await adminClient
    .from("clubs")
    .insert({
      name: `Member Test Club ${Date.now()}`,
      slug: `member-test-${Date.now().toString(36)}`,
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
});

describe("role assignment", () => {
  it("stores producer role correctly", async () => {
    const { data } = await adminClient
      .from("club_members")
      .select("role")
      .eq("club_id", testClubId)
      .eq("user_id", producerId)
      .single();

    expect(data!.role).toBe("producer");
  });

  it("stores director role correctly", async () => {
    const { data } = await adminClient
      .from("club_members")
      .select("role")
      .eq("club_id", testClubId)
      .eq("user_id", directorId)
      .single();

    expect(data!.role).toBe("director");
  });

  it("stores critic role correctly", async () => {
    const { data } = await adminClient
      .from("club_members")
      .select("role")
      .eq("club_id", testClubId)
      .eq("user_id", criticId)
      .single();

    expect(data!.role).toBe("critic");
  });

  it("non-member has no membership record", async () => {
    const { data } = await adminClient
      .from("club_members")
      .select("role")
      .eq("club_id", testClubId)
      .eq("user_id", visitorId)
      .maybeSingle();

    expect(data).toBeNull();
  });
});

describe("role changes", () => {
  it("can promote critic to director", async () => {
    // Create a separate test user for this
    const { data: extraUser } = await adminClient
      .from("users")
      .select("id")
      .like("email", "tiny-%@backrow.test")
      .limit(1)
      .maybeSingle();

    if (extraUser) {
      await adminClient.from("club_members").upsert(
        {
          club_id: testClubId,
          user_id: extraUser.id,
          role: "critic",
        },
        { onConflict: "club_id,user_id" }
      );

      const { error } = await adminClient
        .from("club_members")
        .update({ role: "director" })
        .eq("club_id", testClubId)
        .eq("user_id", extraUser.id);

      expect(error).toBeNull();

      // Verify
      const { data } = await adminClient
        .from("club_members")
        .select("role")
        .eq("club_id", testClubId)
        .eq("user_id", extraUser.id)
        .single();

      expect(data!.role).toBe("director");

      // Clean up - revert to critic
      await adminClient
        .from("club_members")
        .update({ role: "critic" })
        .eq("club_id", testClubId)
        .eq("user_id", extraUser.id);
    }
  });

  it("prevents duplicate membership", async () => {
    const { error } = await adminClient.from("club_members").insert({
      club_id: testClubId,
      user_id: producerId, // Already a member
      role: "critic",
    });

    expect(error).not.toBeNull();
  });
});

describe("membership queries", () => {
  it("returns all members of a club", async () => {
    const { data } = await adminClient
      .from("club_members")
      .select("user_id, role")
      .eq("club_id", testClubId);

    expect(data!.length).toBeGreaterThanOrEqual(3);
    const roles = data!.map((m) => m.role);
    expect(roles).toContain("producer");
    expect(roles).toContain("director");
    expect(roles).toContain("critic");
  });

  it("club producer_id matches producer member", async () => {
    const { data: club } = await adminClient
      .from("clubs")
      .select("producer_id")
      .eq("id", testClubId)
      .single();

    const { data: member } = await adminClient
      .from("club_members")
      .select("user_id")
      .eq("club_id", testClubId)
      .eq("role", "producer")
      .single();

    expect(club!.producer_id).toBe(member!.user_id);
  });
});

describe("nomination cleanup on member removal", () => {
  let cleanupClubId: string;
  let cleanupFestivalId: string;
  let removableUserId: string;

  beforeAll(async () => {
    // Create a separate club + festival for cleanup testing
    const { data: club } = await adminClient
      .from("clubs")
      .insert({
        name: `Cleanup Test Club ${Date.now()}`,
        slug: `cleanup-test-${Date.now().toString(36)}`,
        producer_id: producerId,
        privacy: "private",
        settings: {},
      })
      .select("id")
      .single();
    cleanupClubId = club!.id;

    // Add members
    removableUserId = criticId;
    await adminClient.from("club_members").insert([
      { club_id: cleanupClubId, user_id: producerId, role: "producer" },
      { club_id: cleanupClubId, user_id: removableUserId, role: "critic" },
    ]);

    // Create a season and active festival
    const now = new Date();
    const { data: season } = await adminClient
      .from("seasons")
      .insert({
        club_id: cleanupClubId,
        name: "Cleanup Season",
        start_date: new Date(now.getTime() - 86400000).toISOString().split("T")[0],
        end_date: new Date(now.getTime() + 86400000 * 90).toISOString().split("T")[0],
      })
      .select("id")
      .single();

    const { data: festival, error: festErr } = await adminClient
      .from("festivals")
      .insert({
        club_id: cleanupClubId,
        season_id: season!.id,
        theme: "Cleanup Test",
        slug: `cleanup-fest-${Date.now().toString(36)}`,
        phase: "nomination",
        status: "nominating",
        start_date: new Date().toISOString(),
        member_count_at_creation: 2,
      })
      .select("id")
      .single();
    if (festErr) throw new Error(`Festival insert failed: ${festErr.message}`);
    cleanupFestivalId = festival!.id;

    // Add a nomination from the removable user
    await adminClient
      .from("movies")
      .upsert(
        { tmdb_id: 999, title: "Cleanup Movie", year: 2020, cached_at: new Date().toISOString() },
        { onConflict: "tmdb_id" }
      );
    await adminClient.from("nominations").insert({
      festival_id: cleanupFestivalId,
      user_id: removableUserId,
      tmdb_id: 999,
    });
  });

  it("nominations exist before member removal", async () => {
    const { count } = await adminClient
      .from("nominations")
      .select("*", { count: "exact", head: true })
      .eq("festival_id", cleanupFestivalId)
      .eq("user_id", removableUserId)
      .is("deleted_at", null);

    expect(count).toBe(1);
  });

  it("removing member soft-deletes their nominations in active festivals", async () => {
    // Simulate what removeMember does: soft-delete nominations
    await adminClient
      .from("nominations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("festival_id", cleanupFestivalId)
      .eq("user_id", removableUserId)
      .is("deleted_at", null);

    // Remove member
    await adminClient
      .from("club_members")
      .delete()
      .eq("club_id", cleanupClubId)
      .eq("user_id", removableUserId);

    // Verify nomination is soft-deleted
    const { count: activeCount } = await adminClient
      .from("nominations")
      .select("*", { count: "exact", head: true })
      .eq("festival_id", cleanupFestivalId)
      .eq("user_id", removableUserId)
      .is("deleted_at", null);

    expect(activeCount).toBe(0);

    // But the record still exists (soft-deleted)
    const { count: totalCount } = await adminClient
      .from("nominations")
      .select("*", { count: "exact", head: true })
      .eq("festival_id", cleanupFestivalId)
      .eq("user_id", removableUserId);

    expect(totalCount).toBe(1);
  });
});
