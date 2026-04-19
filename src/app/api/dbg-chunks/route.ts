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
const REQUIRE_RE = /require\(["`']([@a-zA-Z0-9_/.-]+-[0-9a-f]{16})["`']\)/g;
// Also find every `e.x("<name>", ...)` externalRequire call — these are the
// Turbopack thunks, whether hash-suffixed or not. `e.x("sharp", ...)` with
// NO hash should still work, but `e.x("something-hash", ...)` may fail.
const EX_RE = /[a-z]\.x\(["`']([@a-zA-Z0-9_/.:-]+)["`']/g;

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
  const allExternalIds = new Set<string>();
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      const localReqs = new Set<string>();
      const reqRe = new RegExp(REQUIRE_RE.source, REQUIRE_RE.flags);
      while ((m = reqRe.exec(content)) !== null) {
        localReqs.add(m[1]);
        allRequires.add(m[1]);
      }
      const exRe = new RegExp(EX_RE.source, EX_RE.flags);
      while ((m = exRe.exec(content)) !== null) {
        allExternalIds.add(m[1]);
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
  const allExternalIdList = [...allExternalIds].sort();

  let marker: unknown = null;
  try {
    marker = JSON.parse(readFileSync(".next/server/PATCH_RAN.json", "utf8"));
  } catch {
    marker = "missing";
  }

  const KNOWN_HASH_NAMES = [
    "sharp-20c6a5da84e2135f",
    "jsdom-5c8b869800590804",
    "jsdom-4cccfac9827ebcfe",
    "import-in-the-middle-ac114f323ad7e863",
    "import-in-the-middle-fb77e65c6e343162",
    "import-in-the-middle-b96cfec811360091",
    "require-in-the-middle-2ca7b9c2766f317e",
  ];
  // Also list node_modules entries matching our hash patterns
  let nodeModulesEntries: string[] = [];
  try {
    nodeModulesEntries = readdirSync("node_modules")
      .filter((n) => /-[0-9a-f]{16}$/.test(n))
      .sort();
  } catch {
    nodeModulesEntries = ["readdir-failed"];
  }
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

  // Test each external ID (from e.x(...) patterns) via a LITERAL require
  // Use `Function` constructor to bypass @vercel/nft's "too dynamic" detection
  const externalResults: Record<string, string> = {};
  for (const id of allExternalIdList) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(id);
      externalResults[id] = `OK (${typeof mod})`;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      externalResults[id] = `FAIL ${e?.code ?? ""} ${e?.message ?? ""}`.slice(0, 200);
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
    allExternalIds: allExternalIdList,
    externalResults,
    nodeModulesEntries,
    // Raw content of the externals_sharp and in-the-middle chunks
    chunkSamples: (() => {
      const targets = [
        files.find((p) => p.includes("sharp_0") && p.includes("externals")),
        files.find((p) => p.includes("0yx2a_") || p.includes("0ds52ll")),
        files.find((p) => p.includes("0f303dm")),
      ].filter(Boolean) as string[];
      const out: Record<string, string> = {};
      for (const f of targets) {
        try {
          out[f] = readFileSync(f, "utf8").slice(0, 3000);
        } catch (e) {
          out[f] = `read-failed: ${(e as Error).message}`;
        }
      }
      return out;
    })(),
  });
}
