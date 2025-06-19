import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { appConfig } from "../config/app";
import * as schema from "./schema";

// Create the connection
const connectionString = appConfig.database.url;
const sql = postgres(connectionString, { max: 1 });

// Create the database instance
export const db = drizzle(sql, { schema });

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
