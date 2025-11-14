
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set in drizzle.config.ts!");
  console.log("💡 Please add your Supabase DATABASE_URL in the Secrets tool");
  throw new Error("DATABASE_URL is required, ensure the database is provisioned");
}

// Parse and fix the connection string for Supabase
let connectionString = process.env.DATABASE_URL;
// Remove brackets if present in password or other parts
if (connectionString) {
  connectionString = connectionString.replace(/\[([^\]]+)\]/g, '$1');
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false }
  },
  verbose: true,
  strict: false,
});
