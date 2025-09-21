import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set in drizzle.config.ts!");
  console.log("💡 Please add your Supabase DATABASE_URL in the Secrets tool");
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
