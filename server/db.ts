import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  console.log("💡 Please add your Supabase DATABASE_URL in the Secrets tool");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("🔗 DATABASE_URL found, attempting connection...");
console.log("🔗 URL format:", process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@')); // Hide password in logs

// Create the postgres client for Supabase
const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10
});
export const db = drizzle(client, { schema });