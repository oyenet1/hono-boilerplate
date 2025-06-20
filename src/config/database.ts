import postgres from "postgres";
import { appConfig } from "./app";
import { drizzle } from "drizzle-orm/node-postgres";
// import { drizzle } from "drizzle-orm/postgres-js";

// Enhanced configuration with connection pooling for scaling

const client = postgres(appConfig.database.url, {
  // Connection pooling for high concurrency
  max: parseInt(process.env.DB_POOL_MAX || "20"), // Maximum connections in pool
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || "20"), // Close idle connections after 20s
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10"), // Connection timeout in seconds
  prepare: false, // Disable prepared statements for better pooling

  // Performance optimizations
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL
  },

  // SSL configuration for production
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,

  // Connection debugging (only in development)
  debug: process.env.NODE_ENV === "development" ? console.log : false,
});

import { Pool } from "pg";

const pool = new Pool({
  connectionString: appConfig.database.url,
});

export const db = drizzle({ client: pool });

// Health check function for database
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query(`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end();
    console.log("Database connection closed gracefully");
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}
