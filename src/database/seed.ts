// Legacy seed.ts - now redirects to the new seeder system
// This file is kept for backward compatibility

import { SeederManager, TestSeeder } from "./seeders";
import { reset } from "drizzle-seed";
import { db } from "./connection";
import * as schema from "./schema";

// Legacy functions for backward compatibility
export async function seedDatabase() {
  console.log(
    "⚠️  Using legacy seedDatabase function. Consider using the new seeder system:"
  );
  console.log("   bun run src/database/seed-runner.ts development");

  await SeederManager.runSeeder("development");
}

export async function seedTestData() {
  const testSeeder = new TestSeeder();
  await testSeeder.run();
}

export async function clearDatabase() {
  console.log("🧹 Clearing database...");
  await reset(db, schema);
  console.log("✅ Database cleared successfully");
}

// Main execution for direct calls
const isMainModule =
  process.argv[1] && import.meta.url.includes(process.argv[1]);

if (isMainModule) {
  const args = process.argv.slice(2);

  console.log("⚠️  You're using the legacy seed.ts file.");
  console.log(
    "💡 Consider using the new seeder system: bun run src/database/seed-runner.ts"
  );
  console.log("");

  if (args.includes("--test")) {
    await seedTestData();
  } else if (args.includes("--clear")) {
    await clearDatabase();
  } else {
    await seedDatabase();
  }
}

// Re-export the new seeder system for convenience
export { SeederManager, SeederRegistry } from "./seeders";
export const seed = seedDatabase; // Alias for backward compatibility
