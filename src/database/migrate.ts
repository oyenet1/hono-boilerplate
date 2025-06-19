import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { appConfig } from "../config/app";

async function runMigrations() {
  console.log("🔄 Running database migrations...");

  try {
    // Create connection for migrations
    const sql = postgres(appConfig.database.url, { max: 1 });
    const db = drizzle(sql);

    // Run migrations
    await migrate(db, {
      migrationsFolder: "./src/database/migrations",
    });

    console.log("✅ Database migrations completed successfully!");

    // Close connection
    await sql.end();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations();
}

export { runMigrations };
