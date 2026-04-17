import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/config/env";

export function createClient() {
  // createBrowserClient handles cookies automatically - no custom handlers needed
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
