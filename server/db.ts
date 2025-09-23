import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { pgTable, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// Define series table here since it's referenced but not in schema
export const series = pgTable("series", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  title: text("title").notNull(),
  description: text("description"),
  authorId: text("author_id").notNull().references(() => schema.users.id, { onDelete: "cascade" }),
  coverImageUrl: text("cover_image_url"),
  genre: text("genre"),
  tags: text("tags").array(),
  isCompleted: boolean("is_completed").default(false),
  totalChapters: integer("total_chapters").default(0),
  followersCount: integer("followers_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse and fix the connection string for Supabase
let connectionString = process.env.DATABASE_URL;

// Handle the password in brackets for Supabase URLs
if (connectionString && connectionString.includes('[') && connectionString.includes(']')) {
  connectionString = connectionString.replace(/\[([^\]]+)\]/, '$1');
}

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in environment variables");
  throw new Error("DATABASE_URL is required");
}

// Create postgres client with proper Supabase configuration
const client = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 5,
  idle_timeout: 10,
  max_lifetime: 60 * 10,
  connect_timeout: 10,
  prepare: false,
  transform: undefined,
  types: {},
  onnotice: () => {},
  onparameter: () => {},
});

export const db = drizzle(client, { schema });

// Add utility function if it doesn't exist
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const posts = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  authorId: text("author_id").notNull().references(() => schema.users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  postType: text("post_type").$type<"text" | "poetry" | "story" | "challenge" | "series" | "novel">().default("text"),
  genre: text("genre"),
  imageUrls: text("image_urls").array(),
  spotifyTrackId: text("spotify_track_id"),
  spotifyTrackData: jsonb("spotify_track_data"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  repostsCount: integer("reposts_count").default(0),
  viewsCount: integer("views_count").default(0),
  isPrivate: boolean("is_private").default(false),
  collaborators: text("collaborators").array(),
  seriesId: text("series_id").references(() => series.id),
  chapterNumber: integer("chapter_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const series = pgTable("series", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  title: text("title").notNull(),
  description: text("description"),
  authorId: text("author_id").notNull().references(() => schema.users.id, { onDelete: "cascade" }),
  coverImageUrl: text("cover_image_url"),
  genre: text("genre"),
  tags: text("tags").array(),
  isCompleted: boolean("is_completed").default(false),
  totalChapters: integer("total_chapters").default(0),
  followersCount: integer("followers_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});