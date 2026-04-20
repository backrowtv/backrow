import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";

/**
 * Direct module-load probe + server-reference-manifest dump. Tells us
 * which action-id maps to toggleFavoriteClub on the PROD lambda (hashes
 * are platform-dependent, so local builds don't match prod).
 * Delete after diagnosis.
 */
export async function GET() {
  const results: Record<string, string> = {};

  const tryLoad = (name: string, fn: () => unknown) => {
    try {
      const mod = fn();
      results[name] = `OK (${typeof mod})`;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      results[name] = `FAIL ${e?.code ?? ""}: ${(e?.message ?? String(err)).slice(0, 400)}`;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  tryLoad("require(jsdom)", () => require("jsdom"));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  tryLoad("require(isomorphic-dompurify)", () => require("isomorphic-dompurify"));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  tryLoad("require(sharp)", () => require("sharp"));

  await (async () => {
    try {
      // @ts-expect-error — jsdom has no type declarations
      const mod = await import("jsdom");
      results["import(jsdom)"] = `OK keys=${Object.keys(mod as object)
        .slice(0, 5)
        .join(",")}`;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      results["import(jsdom)"] =
        `FAIL ${e?.code ?? ""}: ${(e?.message ?? String(err)).slice(0, 400)}`;
    }
  })();

  await (async () => {
    try {
      const mod = await import("isomorphic-dompurify");
      results["import(isomorphic-dompurify)"] = `OK keys=${Object.keys(mod).slice(0, 5).join(",")}`;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      results["import(isomorphic-dompurify)"] =
        `FAIL ${e?.code ?? ""}: ${(e?.message ?? String(err)).slice(0, 400)}`;
    }
  })();

  await (async () => {
    try {
      const mod = await import("@/app/actions/clubs/membership");
      results["import(membership)"] = `OK keys=${Object.keys(mod).slice(0, 5).join(",")}`;
    } catch (err) {
      const e = err as { code?: string; message?: string; stack?: string };
      results["import(membership)"] =
        `FAIL ${e?.code ?? ""}: ${(e?.message ?? String(err)).slice(0, 400)} | stack=${(e?.stack ?? "").split("\n").slice(0, 5).join(" | ")}`;
    }
  })();

  // Read the action-ids manifest for the club slug page, so we can map
  // the next-action header observed on prod to the exported function.
  const manifests: Array<{
    path: string;
    entries?: Record<string, string>;
    error?: string;
  }> = [];
  const candidates = [
    "/var/task/.next/server/app/(dashboard)/club/[slug]/page/server-reference-manifest.json",
    ".next/server/app/(dashboard)/club/[slug]/page/server-reference-manifest.json",
    "/var/task/.next/server/server-reference-manifest.json",
    ".next/server/server-reference-manifest.json",
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) {
        manifests.push({ path: p, error: "missing" });
        continue;
      }
      const raw = readFileSync(p, "utf8");
      const json = JSON.parse(raw);
      const node = json.node ?? json;
      const entries: Record<string, string> = {};
      for (const [actionId, info] of Object.entries(node)) {
        const i = info as { exportedName?: string; filename?: string };
        entries[actionId] = `${i.filename}#${i.exportedName}`;
      }
      manifests.push({ path: p, entries });
    } catch (err) {
      const e = err as { message?: string };
      manifests.push({ path: p, error: e.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({ results, manifests });
}
