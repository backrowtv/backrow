/**
 * Permission Matrix Tests
 *
 * Tests that every permission check function correctly allows/denies
 * access based on role. Uses real Supabase (not mocks).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { adminClient, getUserId } from "../setup/supabase-test-client";

// We test the permission helpers directly since they accept a supabase client
import {
  checkAdminPermission,
  checkProducerPermission,
  checkMembership,
} from "@/app/actions/clubs/_helpers";

let producerId: string;
let directorId: string;
let criticId: string;
let visitorId: string;
let testClubId: string;

beforeAll(async () => {
  // Get existing test user IDs
  producerId = await getUserId("producer@test.backrow.tv");
  directorId = await getUserId("director@test.backrow.tv");
  criticId = await getUserId("critic@test.backrow.tv");
  visitorId = await getUserId("visitor@test.backrow.tv");

  // Get or create a test club with all roles assigned
  const { data: existingClub } = await adminClient
    .from("clubs")
    .select("id")
    .eq("slug", "festival-test-lab")
    .maybeSingle();

  if (existingClub) {
    testClubId = existingClub.id;
  } else {
    // Create a test club for permission testing (unique slug per run)
    const { data: club } = await adminClient
      .from("clubs")
      .insert({
        name: `Permission Test Club ${Date.now()}`,
        slug: `perm-test-${Date.now().toString(36)}`,
        producer_id: producerId,
        privacy: "private",
        settings: {},
      })
      .select("id")
      .single();

    testClubId = club!.id;

    // Add members with different roles
    await adminClient.from("club_members").upsert(
      [
        { club_id: testClubId, user_id: producerId, role: "producer" },
        { club_id: testClubId, user_id: directorId, role: "director" },
        { club_id: testClubId, user_id: criticId, role: "critic" },
      ],
      { onConflict: "club_id,user_id" }
    );
  }
});

describe("checkMembership", () => {
  it("returns isMember=true and role for producer", async () => {
    const result = await checkMembership(adminClient, testClubId, producerId);
    expect(result.isMember).toBe(true);
    expect(result.role).toBe("producer");
  });

  it("returns isMember=true and role for director", async () => {
    const result = await checkMembership(adminClient, testClubId, directorId);
    expect(result.isMember).toBe(true);
    expect(result.role).toBe("director");
  });

  it("returns isMember=true and role for critic", async () => {
    const result = await checkMembership(adminClient, testClubId, criticId);
    expect(result.isMember).toBe(true);
    expect(result.role).toBe("critic");
  });

  it("returns isMember=false for non-member", async () => {
    const result = await checkMembership(adminClient, testClubId, visitorId);
    expect(result.isMember).toBe(false);
    expect(result.role).toBeNull();
  });

  it("returns isMember=false for invalid club ID", async () => {
    const result = await checkMembership(
      adminClient,
      "00000000-0000-0000-0000-000000000000",
      producerId
    );
    expect(result.isMember).toBe(false);
  });
});

describe("checkAdminPermission", () => {
  it("returns isAdmin=true for producer", async () => {
    const result = await checkAdminPermission(adminClient, testClubId, producerId);
    expect(result.isAdmin).toBe(true);
    expect(result.role).toBe("producer");
  });

  it("returns isAdmin=true for director", async () => {
    const result = await checkAdminPermission(adminClient, testClubId, directorId);
    expect(result.isAdmin).toBe(true);
    expect(result.role).toBe("director");
  });

  it("returns isAdmin=false for critic", async () => {
    const result = await checkAdminPermission(adminClient, testClubId, criticId);
    expect(result.isAdmin).toBe(false);
    expect(result.role).toBe("critic");
  });

  it("returns isAdmin=false for non-member", async () => {
    const result = await checkAdminPermission(adminClient, testClubId, visitorId);
    expect(result.isAdmin).toBe(false);
    expect(result.role).toBeNull();
  });
});

describe("checkProducerPermission", () => {
  it("returns true for producer", async () => {
    const result = await checkProducerPermission(adminClient, testClubId, producerId);
    expect(result).toBe(true);
  });

  it("returns false for director", async () => {
    const result = await checkProducerPermission(adminClient, testClubId, directorId);
    expect(result).toBe(false);
  });

  it("returns false for critic", async () => {
    const result = await checkProducerPermission(adminClient, testClubId, criticId);
    expect(result).toBe(false);
  });

  it("returns false for non-member", async () => {
    const result = await checkProducerPermission(adminClient, testClubId, visitorId);
    expect(result).toBe(false);
  });
});

describe("permission hierarchy", () => {
  it("producer has all permissions (admin + producer + member)", async () => {
    const admin = await checkAdminPermission(adminClient, testClubId, producerId);
    const producer = await checkProducerPermission(adminClient, testClubId, producerId);
    const member = await checkMembership(adminClient, testClubId, producerId);

    expect(admin.isAdmin).toBe(true);
    expect(producer).toBe(true);
    expect(member.isMember).toBe(true);
  });

  it("director has admin + member but not producer", async () => {
    const admin = await checkAdminPermission(adminClient, testClubId, directorId);
    const producer = await checkProducerPermission(adminClient, testClubId, directorId);
    const member = await checkMembership(adminClient, testClubId, directorId);

    expect(admin.isAdmin).toBe(true);
    expect(producer).toBe(false);
    expect(member.isMember).toBe(true);
  });

  it("critic has member only", async () => {
    const admin = await checkAdminPermission(adminClient, testClubId, criticId);
    const producer = await checkProducerPermission(adminClient, testClubId, criticId);
    const member = await checkMembership(adminClient, testClubId, criticId);

    expect(admin.isAdmin).toBe(false);
    expect(producer).toBe(false);
    expect(member.isMember).toBe(true);
  });

  it("non-member has no permissions", async () => {
    const admin = await checkAdminPermission(adminClient, testClubId, visitorId);
    const producer = await checkProducerPermission(adminClient, testClubId, visitorId);
    const member = await checkMembership(adminClient, testClubId, visitorId);

    expect(admin.isAdmin).toBe(false);
    expect(producer).toBe(false);
    expect(member.isMember).toBe(false);
  });
});
