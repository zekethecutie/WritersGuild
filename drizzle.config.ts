
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set in drizzle.config.ts!");
  console.log("💡 Please add your Supabase DATABASE_URL in the Secrets tool");
  throw new Error("DATABASE_URL is required, ensure the database is provisioned");
}

// Parse and fix the connection string for Supabase/Neon
let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('[') && connectionString.includes(']')) {
  connectionString = connectionString.replace(/\[([^\]]+)\]/, '$1');
}

// Use Neon's connection pooler for better connection management
if (connectionString && connectionString.includes('.neon.tech')) {
  connectionString = connectionString.replace(/\.neon\.tech/, '-pooler.neon.tech');
} else if (connectionString && connectionString.includes('.us-east-2.aws.neon.tech')) {
  connectionString = connectionString.replace(/\.us-east-2\.aws\.neon\.tech/, '-pooler.us-east-2.aws.neon.tech');
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
