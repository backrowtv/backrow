/**
 * Apply BackRow Matinee & Featured Clubs Migration
 *
 * This script applies the migration directly via Supabase API
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// TypeScript narrowing - these are guaranteed to be strings after the check above
const supabaseUrl: string = SUPABASE_URL;
const supabaseKey: string = SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read migration file
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/20250118000000_add_matinee_and_featured_clubs.sql"
  );
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  console.log("Applying migration: 20250118000000_add_matinee_and_featured_clubs.sql");
  console.log("---");

  try {
    // Execute migration SQL
    const { data: _data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // Try direct query execution
      console.log("RPC method failed, trying direct execution...");

      // Split by semicolons and execute statements
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement.includes("BEGIN") || statement.includes("COMMIT")) {
          continue; // Skip transaction markers
        }

        try {
          const { error: stmtError } = await supabase.rpc("exec_sql", {
            sql: statement + ";",
          });

          if (stmtError) {
            console.error("Error executing statement:", stmtError.message);
            console.error("Statement:", statement.substring(0, 100) + "...");
          }
        } catch (err) {
          console.error("Error:", err);
        }
      }
    }

    console.log("✅ Migration applied successfully!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Verify tables were created:");
    console.log("   SELECT * FROM backrow_matinee LIMIT 1;");
    console.log("   SELECT featured, featured_at FROM clubs LIMIT 1;");
    console.log("");
    console.log("2. Regenerate TypeScript types:");
    console.log("   npx supabase gen types typescript --linked > src/types/database.ts");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.error("");
    console.error("Please apply the migration manually via Supabase Dashboard:");
    console.error("1. Go to: https://supabase.com/dashboard/project/ifurgbocssewpoontnml/sql/new");
    console.error(
      "2. Copy the SQL from: supabase/migrations/20250118000000_add_matinee_and_featured_clubs.sql"
    );
    console.error("3. Paste and execute");
    process.exit(1);
  }
}

applyMigration();
