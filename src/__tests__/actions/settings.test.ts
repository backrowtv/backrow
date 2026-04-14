/**
 * Club Settings Tests
 *
 * Tests settings update validation, preset application, and setting interactions.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { adminClient, getUserId } from "../setup/supabase-test-client";

let producerId: string;
let testClubId: string;

beforeAll(async () => {
  producerId = await getUserId("producer@test.backrow.tv");

  const { data: club } = await adminClient
    .from("clubs")
    .insert({
      name: `Settings Test Club ${Date.now()}`,
      slug: `settings-test-${Date.now().toString(36)}`,
      producer_id: producerId,
      privacy: "private",
      settings: {
        festival_type: "standard",
        themes_enabled: true,
        theme_governance: "democracy",
        club_ratings_enabled: true,
        rating_min: 0,
        rating_max: 10,
        rating_increment: 0.1,
      },
    })
    .select("id")
    .single();
  testClubId = club!.id;

  await adminClient.from("club_members").insert({
    club_id: testClubId,
    user_id: producerId,
    role: "producer",
  });
});

describe("settings storage", () => {
  it("stores settings as JSONB", async () => {
    const { data } = await adminClient
      .from("clubs")
      .select("settings")
      .eq("id", testClubId)
      .single();

    const settings = data!.settings as Record<string, unknown>;
    expect(settings.festival_type).toBe("standard");
    expect(settings.themes_enabled).toBe(true);
  });

  it("updates settings with merge", async () => {
    const { data: before } = await adminClient
      .from("clubs")
      .select("settings")
      .eq("id", testClubId)
      .single();

    const currentSettings = before!.settings as Record<string, unknown>;
    const merged = { ...currentSettings, max_nominations_per_user: 3 };

    const { error } = await adminClient
      .from("clubs")
      .update({ settings: merged })
      .eq("id", testClubId);

    expect(error).toBeNull();

    const { data: after } = await adminClient
      .from("clubs")
      .select("settings")
      .eq("id", testClubId)
      .single();

    const updatedSettings = after!.settings as Record<string, unknown>;
    expect(updatedSettings.max_nominations_per_user).toBe(3);
    // Previous settings preserved
    expect(updatedSettings.festival_type).toBe("standard");
  });
});

describe("setting interactions", () => {
  it("blind nominations and guessing are independent at DB level", async () => {
    // DB allows any combination — app-level validation handles dependencies
    const { error } = await adminClient
      .from("clubs")
      .update({
        settings: {
          blind_nominations_enabled: true,
          nomination_guessing_enabled: true,
        },
      })
      .eq("id", testClubId);

    expect(error).toBeNull();
  });

  it("rating scale values stored correctly", async () => {
    const { error } = await adminClient
      .from("clubs")
      .update({
        settings: {
          rating_min: 1,
          rating_max: 5,
          rating_increment: 1,
        },
        rating_min: 1,
        rating_max: 5,
        rating_increment: 1,
      })
      .eq("id", testClubId);

    expect(error).toBeNull();

    const { data } = await adminClient
      .from("clubs")
      .select("rating_min, rating_max, rating_increment")
      .eq("id", testClubId)
      .single();

    expect(data!.rating_min).toBe(1);
    expect(data!.rating_max).toBe(5);
    expect(data!.rating_increment).toBe(1);
  });

  it("placement points stores custom config as JSONB", async () => {
    const customPoints = {
      type: "custom",
      points: [
        { place: 1, points: 25 },
        { place: 2, points: 15 },
        { place: 3, points: 10 },
      ],
    };

    const { data: before } = await adminClient
      .from("clubs")
      .select("settings")
      .eq("id", testClubId)
      .single();

    const merged = {
      ...(before!.settings as Record<string, unknown>),
      placement_points: customPoints,
    };

    const { error } = await adminClient
      .from("clubs")
      .update({ settings: merged })
      .eq("id", testClubId);

    expect(error).toBeNull();

    const { data: after } = await adminClient
      .from("clubs")
      .select("settings")
      .eq("id", testClubId)
      .single();

    const settings = after!.settings as Record<string, unknown>;
    const pp = settings.placement_points as Record<string, unknown>;
    expect(pp.type).toBe("custom");
  });
});

describe("privacy levels", () => {
  const privacyLevels = ["private", "public_open", "public_moderated"];

  it.each(privacyLevels)("accepts privacy level: %s", async (privacy) => {
    const { data, error } = await adminClient
      .from("clubs")
      .insert({
        name: `Privacy ${privacy} ${Date.now()}`,
        slug: `privacy-${privacy}-${Date.now().toString(36)}`,
        producer_id: producerId,
        privacy,
        settings: {},
      })
      .select("id, privacy")
      .single();

    expect(error).toBeNull();
    expect(data!.privacy).toBe(privacy);
  });
});
