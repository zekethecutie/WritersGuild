
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set in drizzle.config.ts!");
  console.log("💡 Please add your Supabase DATABASE_URL in the Secrets tool");
  throw new Error("DATABASE_URL is required, ensure the database is provisioned");
}

// Parse and fix the connection string for Supabase
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('[') && connectionString.includes(']')) {
  connectionString = connectionString.replace(/\[([^\]]+)\]/, '$1');
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: 'require',
  },
  verbose: true,
  strict: true,
});
