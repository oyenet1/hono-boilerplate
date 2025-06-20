import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Enhanced configuration with connection pooling for scaling
const client = postgres(
  process.env.DATABASE_URL || "postgresql://localhost:5432/hono_db",
  {
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
  }
);

export const db = drizzle(client);

// Health check function for database
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await client`SELECT 1`;
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
