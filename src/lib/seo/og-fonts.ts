import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Righteous TTF lives at public/fonts/Righteous-Regular.ttf. We load it via
// `readFile(join(process.cwd(), ...))` — the pattern documented in the
// Next.js OG-image docs. @vercel/nft traces this and bundles the file with
// the function automatically.
//
// IMPORTANT: next/og (Satori) does NOT support WOFF2. Only TTF, OTF, or
// (legacy) WOFF. We previously had a WOFF2 here and it silently failed
// to parse, killing the route at request time with a "failed to pipe
// response" runtime error.

const FONT_PATH = join(process.cwd(), "public/fonts/Righteous-Regular.ttf");

let cachedBuffer: ArrayBuffer | null = null;

export async function loadRighteous(): Promise<ArrayBuffer | null> {
  if (cachedBuffer) return cachedBuffer;
  try {
    const buffer = await readFile(FONT_PATH);
    cachedBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return cachedBuffer;
  } catch (err) {
    console.error(`[og-fonts] readFile failed for ${FONT_PATH}:`, err);
    return null;
  }
}
