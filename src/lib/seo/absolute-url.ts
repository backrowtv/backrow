import { env } from "@/lib/config/env";

export const SITE_URL = (env.NEXT_PUBLIC_APP_URL ?? "https://backrow.tv").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}
