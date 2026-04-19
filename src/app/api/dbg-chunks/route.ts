import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Temporary debug endpoint — returns the contents of the Turbopack external
 * chunks so we can confirm whether the post-build patcher actually ran on
 * Vercel's build. Remove once the hash-external bug is fully resolved.
 *
 * Unprotected because it only reveals bundle filenames + grep stats; no
 * secrets. Delete after diagnosis.
 */
const HASH_RE = /([@a-zA-Z0-9_/.-]+)-[0-9a-f]{16}/g;
// Matches only the actual broken thunks: `require("<name>-<hash>")`.
// This ignores incidental hash-looking strings in comments, URLs, etc.
const REQUIRE_RE = /require\(["`']([@a-zA-Z0-9_/.-]+-[0-9a-f]{16})["`']\)/g;

function walk(dir: string, acc: string[] = []): string[] {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.isFile() && e.name.endsWith(".js")) acc.push(full);
  }
  return acc;
}

export async function GET() {
  const candidates = [
    ".next/server/chunks",
    ".next/server",
    "/var/task/.next/server",
    process.cwd(),
  ];
  const existing = candidates.filter((c) => {
    try {
      readdirSync(c);
      return true;
    } catch {
      return false;
    }
  });

  const files = walk(".next/server");
  const hits: Array<{ file: string; matches: string[] }> = [];
  const allRequires = new Set<string>();
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      const localReqs = new Set<string>();
      const re = new RegExp(REQUIRE_RE.source, REQUIRE_RE.flags);
      while ((m = re.exec(content)) !== null) {
        localReqs.add(m[1]);
        allRequires.add(m[1]);
      }
      const matches = content.match(HASH_RE);
      if ((matches && matches.length > 0) || localReqs.size > 0) {
        const uniq = [...new Set(matches ?? [])].slice(0, 20);
        hits.push({ file, matches: uniq });
      }
    } catch {
      // skip
    }
  }
  const allRequireList = [...allRequires].sort();

  let marker: unknown = null;
  try {
    marker = JSON.parse(readFileSync(".next/server/PATCH_RAN.json", "utf8"));
  } catch {
    marker = "missing";
  }

  const KNOWN_HASH_NAMES = [
    "sharp-20c6a5da84e2135f",
    "jsdom-5c8b869800590804",
    "import-in-the-middle-ac114f323ad7e863",
    "import-in-the-middle-fb77e65c6e343162",
    "import-in-the-middle-b96cfec811360091",
    "require-in-the-middle-2ca7b9c2766f317e",
  ];
  const requireResults: Record<string, string> = {};
  for (const name of KNOWN_HASH_NAMES) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(name);
      requireResults[name] = `OK (${typeof mod})`;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      requireResults[name] = `FAIL ${e?.code ?? ""} ${e?.message ?? ""}`.slice(0, 200);
    }
  }

  // Test each discovered require name to see which ones still fail
  const allRequireResults: Record<string, string> = {};
  for (const name of allRequireList) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(name);
      allRequireResults[name] = `OK (${typeof mod})`;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      allRequireResults[name] = `FAIL ${e?.code ?? ""} ${e?.message ?? ""}`.slice(0, 200);
    }
  }

  return NextResponse.json({
    cwd: process.cwd(),
    existing,
    marker,
    totalScanned: files.length,
    filesWithHashExternals: hits.length,
    hits,
    requireResults,
    allRequireNames: allRequireList,
    allRequireResults,
  });
}
