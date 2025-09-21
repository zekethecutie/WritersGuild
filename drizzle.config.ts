
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set in drizzle.config.ts!");
  console.log("💡 Please add your Supabase DATABASE_URL in the Secrets tool");
  throw new Error("DATABASE_URL is required, ensure the database is provisioned");
}

// Parse and fix the connection string for Supabase
let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('[') && connectionString.includes(']')) {
  connectionString = connectionString.replace(/\[([^\]]+)\]/, '$1');
}

const dbConfig: any = {
  url: connectionString,
};

// Only add SSL config for Supabase URLs
if (connectionString && connectionString.includes('supabase.com')) {
  dbConfig.ssl = { rejectUnauthorized: false };
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: dbConfig,
  verbose: true,
  strict: true,
});
