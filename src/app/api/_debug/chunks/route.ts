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
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HASH_RE = /([@a-zA-Z0-9_/.-]+)-[0-9a-f]{16}/g;

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
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      const matches = content.match(HASH_RE);
      if (matches && matches.length > 0) {
        // Dedupe and limit
        const uniq = [...new Set(matches)].slice(0, 20);
        hits.push({ file, matches: uniq });
      }
    } catch {
      // skip
    }
  }

  return NextResponse.json({
    cwd: process.cwd(),
    existing,
    totalScanned: files.length,
    filesWithHashExternals: hits.length,
    hits,
  });
}
