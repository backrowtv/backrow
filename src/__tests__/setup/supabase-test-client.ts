/**
 * Test Setup — Supabase Test Clients
 *
 * Creates authenticated Supabase clients for each test role.
 * Uses the real local/dev Supabase instance (not mocks).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars for tests. Ensure .env.local has URL, SERVICE_ROLE_KEY, and ANON_KEY."
  );
}

/**
 * Service-role client — bypasses RLS. Use for test setup/teardown only.
 */
export const adminClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Create an authenticated client that acts as a specific user.
 * Uses service role to sign in, then returns a client with that user's session.
 * This client RESPECTS RLS policies.
 */
export async function createAuthenticatedClient(
  email: string,
  password: string = "TestPassword123!"
): Promise<SupabaseClient> {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Failed to sign in as ${email}: ${error.message}`);
  }

  return client;
}

/**
 * Pre-configured test user credentials
 */
export const TEST_CREDENTIALS = {
  producer: { email: "producer@test.backrow.tv", password: "TestPassword123!" },
  director: { email: "director@test.backrow.tv", password: "TestPassword123!" },
  critic: { email: "critic@test.backrow.tv", password: "TestPassword123!" },
  visitor: { email: "visitor@test.backrow.tv", password: "TestPassword123!" },
} as const;

/**
 * Get user ID from email using admin client
 */
export async function getUserId(email: string): Promise<string> {
  const { data } = await adminClient.from("users").select("id").eq("email", email).single();

  if (!data) throw new Error(`User not found: ${email}`);
  return data.id;
}

/**
 * Get the test club ID (festival-test-lab)
 */
export async function getTestClubId(): Promise<string> {
  const { data } = await adminClient
    .from("clubs")
    .select("id")
    .eq("slug", "festival-test-lab")
    .single();

  if (!data) throw new Error("Test club 'festival-test-lab' not found");
  return data.id;
}
