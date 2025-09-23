
-- Add collaboration and series support
CREATE TABLE IF NOT EXISTS "series" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "description" text,
  "author_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cover_image_url" text,
  "genre" text,
  "tags" text[],
  "is_completed" boolean DEFAULT false,
  "total_chapters" integer DEFAULT 0,
  "followers_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add new columns to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "collaborators" text[];
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "series_id" text REFERENCES "series"("id");
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "chapter_number" integer;

-- Update post_type enum to include new types
-- Note: In production, you'd want to handle this more carefully
-- For now, we'll just update the constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'posts_post_type_check') THEN
        ALTER TABLE "posts" DROP CONSTRAINT "posts_post_type_check";
    END IF;
    
    ALTER TABLE "posts" ADD CONSTRAINT "posts_post_type_check" 
    CHECK ("post_type" IN ('text', 'poetry', 'story', 'challenge', 'series', 'novel'));
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_posts_series_id" ON "posts"("series_id");
CREATE INDEX IF NOT EXISTS "idx_posts_collaborators" ON "posts" USING GIN("collaborators");
CREATE INDEX IF NOT EXISTS "idx_series_author_id" ON "series"("author_id");
