/**
 * Regression test — skeleton-system discipline.
 *
 * Rule: loading placeholders must use the shared `<Skeleton>` primitive
 * from `src/components/ui/skeleton.tsx`. Raw `animate-pulse` divs coupled
 * with `bg-[var(--surface-1)]` / `bg-[var(--surface-2)]` / `bg-[var(--surface-3)]`
 * backgrounds are the signature of a bypass — they silently drift from the
 * centralized color + animation timing and never pick up accessibility
 * attributes.
 *
 * Legitimate non-skeleton uses of `animate-pulse` (status dots, icon halos,
 * live-countdown emphasis, pull-to-refresh) do NOT pair with a surface-N
 * background, so this heuristic leaves them alone.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const SRC_ROOT = resolve(__dirname, "../..");
const SKELETON_COMPONENT = resolve(SRC_ROOT, "components/ui/skeleton.tsx");

const SKIP_DIRS = new Set(["node_modules", ".next", "__tests__"]);
const CHECK_EXTENSIONS = new Set([".ts", ".tsx"]);

// Matches any `animate-pulse` usage whose surrounding ~200 chars contain a
// skeleton-style surface background. Multiline so Tailwind-in-cn-split cases
// are caught.
const BYPASS_PATTERN =
  /bg-\[var\(--surface-[123]\)\][^<>]{0,200}animate-pulse|animate-pulse[^<>]{0,200}bg-\[var\(--surface-[123]\)\]/s;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      const ext = full.slice(full.lastIndexOf("."));
      if (CHECK_EXTENSIONS.has(ext)) out.push(full);
    }
  }
  return out;
}

describe("skeleton system discipline", () => {
  it("no file outside skeleton.tsx mixes animate-pulse with a surface background", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      if (file === SKELETON_COMPONENT) continue;
      const source = readFileSync(file, "utf8");
      if (BYPASS_PATTERN.test(source)) {
        offenders.push(file.replace(SRC_ROOT + "/", ""));
      }
    }
    expect(
      offenders,
      `Use <Skeleton> from @/components/ui/skeleton instead of raw animate-pulse + bg-[var(--surface-N)] divs in:\n  - ${offenders.join("\n  - ")}`
    ).toEqual([]);
  });
});
