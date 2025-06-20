import { drizzle } from "drizzle-orm/node-postgres";
import { appConfig } from "../config/app";

import { Pool } from "pg";
const pool = new Pool({ connectionString: appConfig.database.url });

const db = drizzle({ client: pool });

const sql = await db.execute("select 1");

// Export the connection for potential direct use
export { sql, db };

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
