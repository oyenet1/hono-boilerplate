import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(
  process.env.DATABASE_URL || "postgresql://localhost:5432/hono_db"
);

export const db = drizzle(client);
