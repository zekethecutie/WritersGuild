
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse and fix the connection string for Supabase
let connectionString = process.env.DATABASE_URL;

// Handle the password in brackets for Supabase URLs
if (connectionString.includes('[') && connectionString.includes(']')) {
  connectionString = connectionString.replace(/\[([^\]]+)\]/, '$1');
}

// Create postgres client with proper Supabase configuration
const client = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 60,
  prepare: false,
  transform: undefined,
  types: {},
  onnotice: () => {},
});

export const db = drizzle(client, { schema });
