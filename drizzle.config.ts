import type { Config } from "drizzle-kit";

export default {
  schema: "./src/database/schema.ts",
  out: "./src/database/migrations",
  driver: "libsql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
