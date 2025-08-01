#!/usr/bin/env bun

import { SeederManager } from "./seeders";
import { reset } from "drizzle-seed";
import { db } from "./connection";
import * as schema from "./schema";

async function main() {
  const args = process.argv.slice(2);

  // Handle help command
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🌱 Database Seeder

Usage:
  bun run seed [seeder-name]     Run a specific seeder
  bun run seed --list            List all available seeders
  bun run seed --clear           Clear the database
  bun run seed --help            Show this help message

Examples:
  bun run seed development       Run development seeder
  bun run seed test             Run test seeder
  bun run seed production       Run production seeder

Environment-specific aliases:
  dev, development              → DevelopmentSeeder
  test, testing                → TestSeeder
  prod, production             → ProductionSeeder
`);
    process.exit(0);
  }

  // Handle list command
  if (args.includes("--list") || args.includes("-l")) {
    await SeederManager.listSeeders();
    process.exit(0);
  }

  // Handle clear command
  if (args.includes("--clear") || args.includes("-c")) {
    console.log("🧹 Clearing database...");
    try {
      await reset(db, schema);
      console.log("✅ Database cleared successfully");
    } catch (error) {
      console.error("❌ Database clearing failed:", error);
      process.exit(1);
    }
    process.exit(0);
  }

  // Get seeder name from arguments
  const seederName = args[0];

  if (!seederName) {
    console.log(
      "❌ Please specify a seeder name or use --help for usage information"
    );
    console.log("\n📋 Quick start:");
    console.log("  bun run seed development    # For development environment");
    console.log("  bun run seed test          # For testing environment");
    console.log("  bun run seed --list        # List all available seeders");
    process.exit(1);
  }

  // Run the specified seeder
  await SeederManager.runSeeder(seederName);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Seeding interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Seeding terminated");
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
