/**
 * Test Factory — CLI Entry Point
 *
 * Usage:
 *   bun tsx scripts/test-factory --scenario=all        # Create all scenarios
 *   bun tsx scripts/test-factory --scenario=tiny        # Single scenario
 *   bun tsx scripts/test-factory --scenario=small
 *   bun tsx scripts/test-factory --scenario=medium
 *   bun tsx scripts/test-factory --scenario=active
 *   bun tsx scripts/test-factory --scenario=large
 *   bun tsx scripts/test-factory --scenario=presets
 *   bun tsx scripts/test-factory --users=50             # Just create 50 users
 *   bun tsx scripts/test-factory --teardown             # Clean up everything
 *   bun tsx scripts/test-factory --teardown=tiny        # Clean up one prefix
 */

import {
  createTinyScenario,
  createSmallScenario,
  createMediumScenario,
  createActiveScenario,
  createLargeScenario,
  createPresetsScenario,
  createMatrixScenario,
  createAllScenarios,
} from "./scenarios";
import { createBulkUsers } from "./users";
import { teardownAll, teardownByPrefix } from "./teardown";

async function main() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value || "true";
    }
  }

  try {
    // Teardown
    if (flags.teardown) {
      if (flags.teardown === "true") {
        await teardownAll();
      } else {
        await teardownByPrefix(flags.teardown);
      }
      return;
    }

    // Just create users
    if (flags.users) {
      const count = parseInt(flags.users, 10);
      if (isNaN(count) || count < 1) {
        console.error("--users must be a positive number");
        process.exit(1);
      }
      await createBulkUsers(count, flags.prefix || "test");
      return;
    }

    // Scenarios
    const scenario = flags.scenario;
    if (!scenario) {
      console.log("Usage:");
      console.log("  bun tsx scripts/test-factory --scenario=all");
      console.log(
        "  bun tsx scripts/test-factory --scenario=tiny|small|medium|active|large|presets|matrix"
      );
      console.log("  bun tsx scripts/test-factory --users=50");
      console.log("  bun tsx scripts/test-factory --teardown");
      console.log("  bun tsx scripts/test-factory --teardown=tiny");
      process.exit(0);
    }

    const scenarioMap: Record<string, () => Promise<unknown>> = {
      tiny: createTinyScenario,
      small: createSmallScenario,
      medium: createMediumScenario,
      active: createActiveScenario,
      large: createLargeScenario,
      presets: createPresetsScenario,
      matrix: createMatrixScenario,
      all: createAllScenarios,
    };

    const runner = scenarioMap[scenario];
    if (!runner) {
      console.error(`Unknown scenario: ${scenario}`);
      console.error(`Available: ${Object.keys(scenarioMap).join(", ")}`);
      process.exit(1);
    }

    const startTime = Date.now();
    await runner();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nCompleted in ${elapsed}s`);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
