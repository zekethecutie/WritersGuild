
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse and fix the connection string for Supabase/Neon
let connectionString = process.env.DATABASE_URL;

// Handle the password in brackets for Supabase URLs
if (connectionString && connectionString.includes('[') && connectionString.includes(']')) {
  connectionString = connectionString.replace(/\[([^\]]+)\]/, '$1');
}

// Use Neon's connection pooler for better connection management
if (connectionString && connectionString.includes('.neon.tech')) {
  // Replace the standard endpoint with the pooler endpoint
  connectionString = connectionString.replace(/\.neon\.tech/, '-pooler.neon.tech');
} else if (connectionString && connectionString.includes('.us-east-2.aws.neon.tech')) {
  connectionString = connectionString.replace(/\.us-east-2\.aws\.neon\.tech/, '-pooler.us-east-2.aws.neon.tech');
}

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in environment variables");
  throw new Error("DATABASE_URL is required");
}

// SSL configuration for Neon
const sslConfig = { rejectUnauthorized: false };

// Create postgres client with connection pooling
const client = postgres(connectionString, {
  ssl: sslConfig,
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // Close connections after 30 minutes
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for Neon compatibility
  transform: undefined,
  types: {},
  onnotice: () => {},
  onparameter: () => {},
});

export const db = drizzle(client, { schema });

// Test connection on startup
client`SELECT 1`
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));
