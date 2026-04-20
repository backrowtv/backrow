import { NextResponse } from "next/server";

/**
 * Direct module-load probe. Tries to require/import common packages
 * using LITERAL strings so @vercel/nft traces them. Exposes what
 * actually loads on the lambda vs what's missing.
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

  // Literal requires — NFT traces these
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  tryLoad("require(jsdom)", () => require("jsdom"));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  tryLoad("require(isomorphic-dompurify)", () => require("isomorphic-dompurify"));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  tryLoad("require(sharp)", () => require("sharp"));

  // Also dynamic imports
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

  // Try loading the actions module the same way the action dispatcher would
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

  return NextResponse.json({ results });
}
