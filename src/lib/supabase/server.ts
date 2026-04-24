import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env } from "@/lib/config/env";

/**
 * Create anonymous Supabase client for cached queries (no cookies needed)
 * Use this for 'use cache' functions that access public data
 * This client uses the anon key but doesn't require dynamic APIs like cookies()
 */
export function createPublicClient() {
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createClient() {
  // Opt the entire render scope out of cacheComponents prerender. Every
  // caller of this function reads cookies (for the Supabase session), which
  // is inherently dynamic. Without this, pages that call createClient()
  // fail prerender with "Uncached data accessed outside <Suspense>".
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

/**
 * Service-role client for cross-user operations that must bypass RLS
 * (e.g. push dispatch reading other users' subscriptions).
 * Never expose to the browser. Only call from server code.
 */
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
