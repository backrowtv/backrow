import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env } from "@/lib/config/env";

// Generated DB types live at ./database.types.ts (regen via `bun run db:gen-types`).
// Factories below are deliberately UNTYPED — typing them with <Database> surfaces
// 200+ pre-existing mismatches between hand-written local types and DB reality.
// To get type safety on a specific query, opt in per-site:
//
//   import type { Database } from "@/lib/supabase/database.types";
//   const supabase = await createClient();
//   const { data } = await supabase.from("clubs").select("*, users(*)")
//     .returns<MyShape>();
//
// Reconciling all local types with generated types is tracked separately.

export function createPublicClient() {
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createClient() {
  await connection();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component - ignore
        }
      },
    },
  });
}

export function createServiceClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = env;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
