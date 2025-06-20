import { drizzle } from "drizzle-orm/node-postgres";
import postgres from "postgres";
import { appConfig } from "../config/app";
import * as schema from "./schema";

import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool });

const sql = await db.execute("select 1");

// Export the connection for potential direct use
export { sql };

// Type definitions
export type Database = typeof db;

const dbPlaceholder = {
  connect: async () => {
    console.log("Database connected");
  },
  disconnect: async () => {
    console.log("Database disconnected");
  },
  query: async (sql: string, params?: any[]) => {
    console.log("Executing query:", sql, params);
    return [];
  },
};

export default dbPlaceholder;
