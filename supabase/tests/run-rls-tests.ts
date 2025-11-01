/**
 * pgTAP RLS Test Runner
 *
 * Runs all .test.sql files against the Supabase database using a direct
 * postgres connection (postgres.js). Runs as the postgres superuser so
 * SET LOCAL ROLE works for RLS testing.
 *
 * Requires DATABASE_URL in .env.local. Get it from:
 *   Supabase Dashboard → Project Settings → Database → Connection string (URI)
 *
 * Usage:
 *   bun run test:rls                  # Run all tests
 *   bun run test:rls -- clubs         # Run only matching test files
 *
 * Each test file uses BEGIN/ROLLBACK so no test data persists.
 */
import { readFileSync, readdirSync } from "fs";
import { resolve, basename } from "path";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

// Build connection URL from Supabase project info
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const databaseUrl = process.env.DATABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

let connectionString: string;

if (databaseUrl) {
  connectionString = databaseUrl;
} else if (supabaseUrl && dbPassword) {
  // Build from Supabase URL + password
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
  if (!projectRef) {
    console.error("Cannot extract project ref from NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }
  connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
} else {
  console.error(
    "Missing database connection. Add one of these to .env.local:\n" +
      "  DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres\n" +
      "  OR: SUPABASE_DB_PASSWORD=your-db-password (used with NEXT_PUBLIC_SUPABASE_URL)\n\n" +
      "Get the connection string from:\n" +
      "  Supabase Dashboard → Project Settings → Database → Connection string (URI)\n" +
      "  Use the 'Session mode' (port 5432) or 'Transaction mode' (port 6543) string."
  );
  process.exit(1);
}

const testsDir = resolve(import.meta.dirname, ".");
const filter = process.argv.slice(2).find((a) => !a.startsWith("-"));

interface TestResult {
  file: string;
  passed: boolean;
  output: string[];
  error?: string;
}

/**
 * Parse TAP output lines from query results.
 */
function parseTapLines(rows: Record<string, unknown>[]): string[] {
  const lines: string[] = [];
  for (const row of rows) {
    for (const val of Object.values(row)) {
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (
          trimmed.startsWith("ok ") ||
          trimmed.startsWith("not ok") ||
          trimmed.startsWith("1..") ||
          trimmed.startsWith("Bail out") ||
          trimmed.startsWith("#") ||
          trimmed.startsWith("Looks like")
        ) {
          lines.push(trimmed);
        }
      }
    }
  }
  return lines;
}

async function runTestFile(connectionString: string, filePath: string): Promise<TestResult> {
  const fileName = basename(filePath);
  const testSql = readFileSync(filePath, "utf-8");

  // Use a fresh connection per test to avoid pgTAP session state leaking
  const sql = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 10 });

  try {
    // Execute the full test SQL using postgres.js unsafe() for multi-statement support
    const results = await sql.unsafe(testSql);

    // results from unsafe() is the last result set
    // For our tests, finish() is the last SELECT before ROLLBACK
    const rows = Array.isArray(results) ? results : [];
    const output = parseTapLines(rows as Record<string, unknown>[]);

    // If finish() returned nothing, all tests passed
    // Check if any prior results had "not ok"
    const passed = !output.some(
      (line) =>
        line.startsWith("not ok") ||
        line.includes("Bail out!") ||
        line.includes("Looks like you failed")
    );

    return { file: fileName, passed, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { file: fileName, passed: false, output: [], error: message };
  } finally {
    await sql.end();
  }
}

async function main() {
  // Quick connectivity check
  const testSql = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 10 });
  try {
    await testSql`SELECT 1 AS ok`;
  } catch (err) {
    console.error("Cannot connect to database:", err instanceof Error ? err.message : err);
    console.error("\nCheck your DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local");
    await testSql.end();
    process.exit(1);
  }
  await testSql.end();

  const testFiles = readdirSync(testsDir)
    .filter((f) => f.endsWith(".test.sql"))
    .filter((f) => !filter || f.includes(filter))
    .map((f) => resolve(testsDir, f))
    .sort();

  if (testFiles.length === 0) {
    console.log("No test files found" + (filter ? ` matching '${filter}'` : ""));
    process.exit(0);
  }

  console.log(`\nBackRow pgTAP RLS Tests`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Running ${testFiles.length} test file(s)...\n`);

  const results: TestResult[] = [];

  for (const file of testFiles) {
    const result = await runTestFile(connectionString, file);
    results.push(result);

    const icon = result.passed ? "PASS" : "FAIL";
    console.log(`  ${icon}  ${result.file}`);

    if (result.output.length > 0) {
      for (const line of result.output) {
        if (String(line).trim()) {
          console.log(`       ${line}`);
        }
      }
    }

    if (result.error) {
      console.log(`       ERROR: ${result.error}`);
    }

    console.log();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\nAll tests passed!\n");
}

main().catch(async (err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
