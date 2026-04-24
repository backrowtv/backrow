// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const listFolders = vi.fn();
const listObjects = vi.fn();
const removeObjects = vi.fn();
const commentDelete = vi.fn();

const storageFrom = vi.fn(() => ({
  list: vi.fn((path: string) => (path === "" ? listFolders() : listObjects())),
  remove: removeObjects,
}));

const tableDelete = vi.fn(() => ({
  not: vi.fn(() => ({
    lt: vi.fn(() => ({
      select: vi.fn(() => commentDelete()),
    })),
  })),
}));

const fromTable = vi.fn(() => ({
  delete: tableDelete,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    storage: { from: storageFrom },
    from: fromTable,
  }),
}));

vi.mock("@/lib/api/cron-auth", () => ({
  verifyCronAuth: () => null,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

async function callRoute() {
  const { GET } = await import("@/app/api/cron/orphan-sweep/route");
  const request = { headers: new Headers() } as unknown as NextRequest;
  const response = await GET(request);
  return (await response.json()) as {
    success: boolean;
    removedExports: number;
    removedComments: number;
    errors: string[];
    commentCutoff: string;
  };
}

beforeEach(() => {
  vi.resetModules();
  listFolders.mockReset();
  listObjects.mockReset();
  removeObjects.mockReset();
  commentDelete.mockReset();
  storageFrom.mockClear();
  tableDelete.mockClear();
  fromTable.mockClear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.CRON_SECRET = "cron";
});

describe("GET /api/cron/orphan-sweep — discussion comment retention", () => {
  it("calls discussion_comments delete with a 30-day cutoff and reports the count", async () => {
    listFolders.mockResolvedValue({ data: [], error: null });
    commentDelete.mockResolvedValue({
      data: [{ id: "c1" }, { id: "c2" }],
      error: null,
    });

    const body = await callRoute();

    expect(fromTable).toHaveBeenCalledWith("discussion_comments");
    expect(body.removedComments).toBe(2);
    expect(body.errors).toEqual([]);
    const cutoff = new Date(body.commentCutoff).getTime();
    const expected = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff - expected)).toBeLessThan(10_000);
  });

  it("reports an error without failing the sweep when the delete errors", async () => {
    listFolders.mockResolvedValue({ data: [], error: null });
    commentDelete.mockResolvedValue({
      data: null,
      error: { message: "db offline" },
    });

    const body = await callRoute();

    expect(body.success).toBe(true);
    expect(body.removedComments).toBe(0);
    expect(body.errors).toContain("discussion_comments: db offline");
  });
});
