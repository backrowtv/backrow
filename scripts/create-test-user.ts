/**
 * Script to create a test user for BackRow development
 *
 * Usage:
 *   npm run create-test-user <email> <password>              # Required args
 *   npm run create-test-user <email> <password> "Display Name"  # With display name
 *
 * Example:
 *   npm run create-test-user myuser@example.com MyPassword123! "My User"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "path";

// Load environment variables from .env.local
config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Please set it in .env.local");
}

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Get email, password, and display name from command line args (required)
const TEST_EMAIL = process.argv[2];
const TEST_PASSWORD = process.argv[3];
const TEST_DISPLAY_NAME =
  process.argv[4] ||
  `Test User ${TEST_EMAIL?.split("@")[0]?.replace("test", "")?.replace("@", "") || ""}`.trim() ||
  "Test User";

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error("❌ Usage: npm run create-test-user <email> <password> [display_name]");
  console.error("   Example: npm run create-test-user myuser@example.com MyPassword123!");
  process.exit(1);
}

async function createTestUser() {
  console.log("👤 Creating test user for BackRow...\n");
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD}\n`);

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === TEST_EMAIL);

    if (existingUser) {
      console.log("⚠️  User already exists. Deleting existing user...");
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);

      // Also delete from public.users if exists
      try {
        await supabaseAdmin.from("users").delete().eq("id", existingUser.id);
      } catch {
        // Ignore errors if user doesn't exist in public.users
      }
    }

    // Create user in auth.users
    console.log("📝 Creating user in auth.users...");
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true, // Auto-confirm email for dev
      user_metadata: {
        display_name: TEST_DISPLAY_NAME,
      },
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    if (!authUser.user) {
      throw new Error("Failed to create auth user: No user returned");
    }

    console.log("✅ User created in auth.users");

    // Generate username from email (before @ symbol)
    const usernameBase = TEST_EMAIL.split("@")[0] || `user_${authUser.user.id.slice(0, 8)}`;

    // Check if username is taken, if so append numbers
    let username = usernameBase;
    let counter = 1;
    while (true) {
      const { data: existingUsername } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (!existingUsername) {
        break; // Username is available
      }
      username = `${usernameBase}${counter}`;
      counter++;
    }

    // Create user in public.users table
    console.log("📝 Creating user in public.users...");
    const { data: _publicUser, error: publicError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUser.user.id,
        email: TEST_EMAIL,
        username: username,
        display_name: TEST_DISPLAY_NAME,
      })
      .select()
      .single();

    if (publicError) {
      // If error is due to duplicate, try to fetch existing user
      if (publicError.code === "23505") {
        const { data: existingPublicUser } = await supabaseAdmin
          .from("users")
          .select()
          .eq("id", authUser.user.id)
          .single();

        if (existingPublicUser) {
          console.log("✅ User already exists in public.users");
          console.log("\n✨ Test user ready!");
          console.log(`\nEmail: ${TEST_EMAIL}`);
          console.log(`Password: ${TEST_PASSWORD}`);
          return;
        }
      }
      throw new Error(`Failed to create public user: ${publicError.message}`);
    }

    console.log("✅ User created in public.users");
    console.log("\n✨ Test user created successfully!");
    console.log(`\nEmail: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log(`\nYou can now sign in at http://localhost:3000/sign-in`);
  } catch (error) {
    console.error("\n❌ Error creating test user:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the script
createTestUser();
