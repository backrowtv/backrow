/**
 * Cache invalidation helpers (src/lib/cache/invalidate.ts)
 *
 * Verifies that each helper calls revalidateTag with the correct tag
 * strings, including cascading parents. No DB access — Supabase service
 * client is mocked when needed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

// Service client used by lookupFestivalParents
const mockMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

import {
  CacheTags,
  invalidateClub,
  invalidateDiscussion,
  invalidateFestival,
  invalidateMember,
  invalidatePoll,
  invalidateSeason,
  invalidateUser,
  invalidateMovie,
  invalidateClubStats,
  invalidateMarketing,
} from "@/lib/cache/invalidate";

beforeEach(() => {
  revalidateTag.mockReset();
  revalidatePath.mockReset();
  mockMaybeSingle.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function tagsBusted(): string[] {
  return revalidateTag.mock.calls.map((call) => call[0] as string);
}

describe("CacheTags formatters", () => {
  it("uses colon scheme for per-entity tags", () => {
    expect(CacheTags.club("abc")).toBe("club:abc");
    expect(CacheTags.festival("f1")).toBe("festival:f1");
    expect(CacheTags.season("s1")).toBe("season:s1");
    expect(CacheTags.discussion("d1")).toBe("discussion:d1");
    expect(CacheTags.poll("p1")).toBe("poll:p1");
    expect(CacheTags.member("u1")).toBe("member:u1");
    expect(CacheTags.user("u1")).toBe("user:u1");
    expect(CacheTags.movie(603)).toBe("movie:603");
  });

  it("tags stats by kind and club", () => {
    expect(CacheTags.clubStats("c1", "participation")).toBe("stats:participation:c1");
    expect(CacheTags.clubStats("c1", "top-movies")).toBe("stats:top-movies:c1");
  });

  it("has stable global tags", () => {
    expect(CacheTags.clubsIndex()).toBe("clubs:index");
    expect(CacheTags.discoverIndex()).toBe("discover:index");
    expect(CacheTags.featuredClub()).toBe("featured:club");
  });
});

describe("invalidateClub", () => {
  it("busts the club tag plus the index tags that list clubs", () => {
    invalidateClub("c1");
    expect(tagsBusted()).toEqual(["club:c1", "clubs:index", "discover:index"]);
  });
});

describe("invalidateFestival", () => {
  it("cascades to club and season when parents are passed explicitly", async () => {
    await invalidateFestival("f1", { clubId: "c1", seasonId: "s1" });

    expect(mockMaybeSingle).not.toHaveBeenCalled();
    expect(tagsBusted()).toEqual([
      "festival:f1",
      "club:c1",
      "clubs:index",
      "discover:index",
      "season:s1",
    ]);
  });

  it("skips the season tag when seasonId is null (endless festival)", async () => {
    await invalidateFestival("f1", { clubId: "c1", seasonId: null });

    expect(mockMaybeSingle).not.toHaveBeenCalled();
    expect(tagsBusted()).toEqual(["festival:f1", "club:c1", "clubs:index", "discover:index"]);
  });

  it("looks up parents via the service client when opts are omitted", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { club_id: "c2", season_id: "s2" },
      error: null,
    });

    await invalidateFestival("f2");

    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
    expect(tagsBusted()).toEqual([
      "festival:f2",
      "club:c2",
      "clubs:index",
      "discover:index",
      "season:s2",
    ]);
  });

  it("is safe when the festival row cannot be found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await invalidateFestival("missing");

    expect(tagsBusted()).toEqual(["festival:missing"]);
  });
});

describe("invalidateDiscussion", () => {
  it("busts discussion + club index cascade", () => {
    invalidateDiscussion("t1", "c1");
    expect(tagsBusted()).toEqual(["discussion:t1", "club:c1", "clubs:index", "discover:index"]);
  });
});

describe("invalidatePoll", () => {
  it("busts poll + club index cascade", () => {
    invalidatePoll("p1", "c1");
    expect(tagsBusted()).toEqual(["poll:p1", "club:c1", "clubs:index", "discover:index"]);
  });
});

describe("invalidateMember", () => {
  it("busts member + user + club index cascade", () => {
    invalidateMember("c1", "u1");
    expect(tagsBusted()).toEqual([
      "member:u1",
      "user:u1",
      "club:c1",
      "clubs:index",
      "discover:index",
    ]);
  });
});

describe("invalidateSeason", () => {
  it("busts season + club index cascade", () => {
    invalidateSeason("s1", "c1");
    expect(tagsBusted()).toEqual(["season:s1", "club:c1", "clubs:index", "discover:index"]);
  });
});

describe("invalidateUser", () => {
  it("busts user + member tags", () => {
    invalidateUser("u1");
    expect(tagsBusted()).toEqual(["user:u1", "member:u1"]);
  });
});

describe("invalidateMovie", () => {
  it("busts just the movie tag", () => {
    invalidateMovie(603);
    expect(tagsBusted()).toEqual(["movie:603"]);
  });
});

describe("invalidateClubStats", () => {
  it("busts a single stats slice when kind is passed", () => {
    invalidateClubStats("c1", "participation");
    expect(tagsBusted()).toEqual([
      "stats:participation:c1",
      "club:c1",
      "clubs:index",
      "discover:index",
    ]);
  });

  it("busts all stats slices when no kind is passed", () => {
    invalidateClubStats("c1");
    expect(tagsBusted()).toEqual(
      expect.arrayContaining([
        "stats:participation:c1",
        "stats:distribution:c1",
        "stats:top-movies:c1",
        "stats:activity:c1",
        "stats:completion:c1",
        "stats:trends:c1",
        "club:c1",
      ])
    );
  });
});

describe("invalidateMarketing", () => {
  it("routes each slot to the matching tag(s)", () => {
    invalidateMarketing("featured-club");
    expect(tagsBusted()).toEqual(["featured:club", "clubs:index"]);
    revalidateTag.mockReset();

    invalidateMarketing("upcoming-movies");
    expect(tagsBusted()).toEqual(["movies:upcoming"]);
    revalidateTag.mockReset();

    invalidateMarketing("popular-movies");
    expect(tagsBusted()).toEqual(["movies:popular"]);
    revalidateTag.mockReset();

    invalidateMarketing("film-news");
    expect(tagsBusted()).toEqual(["news:film"]);
  });
});

describe("tag safety", () => {
  it("never emits a tag containing an email, display name, or '@'", async () => {
    await invalidateFestival("f1", { clubId: "c1", seasonId: "s1" });
    invalidateClub("c1");
    invalidateMember("c1", "u1");
    invalidateDiscussion("t1", "c1");
    invalidatePoll("p1", "c1");
    invalidateClubStats("c1", "participation");
    invalidateMarketing("featured-club");

    for (const tag of tagsBusted()) {
      expect(tag).not.toMatch(/@/);
      expect(tag).not.toMatch(/[A-Z]/); // IDs are lowercase; prevents display-name leak
    }
  });
});
