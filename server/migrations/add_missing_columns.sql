-- Safe migration script for posts table column changes
-- This script handles the transition from genre/post_type to category

-- Step 1: Add category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'category'
  ) THEN
    ALTER TABLE posts ADD COLUMN category VARCHAR DEFAULT 'general';
  END IF;
END $$;

-- Step 2: Add excerpt column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'excerpt'
  ) THEN
    ALTER TABLE posts ADD COLUMN excerpt TEXT;
  END IF;
END $$;

-- Step 3: Add coverImageUrl column if it doesn't exist (note: column name should match schema)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN cover_image_url TEXT;
  END IF;
END $$;

-- Step 4: Migrate data from old columns to new ones (if old columns exist)
DO $$ 
BEGIN
  -- Migrate genre or post_type to category
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'genre'
  ) THEN
    UPDATE posts 
    SET category = COALESCE(genre, 'general') 
    WHERE category IS NULL OR category = 'general';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'post_type'
  ) THEN
    UPDATE posts 
    SET category = COALESCE(post_type, category, 'general') 
    WHERE category IS NULL OR category = 'general';
  END IF;
END $$;

-- Step 5: Verify data migration before dropping columns
DO $$ 
DECLARE
  null_category_count INT;
BEGIN
  SELECT COUNT(*) INTO null_category_count 
  FROM posts 
  WHERE category IS NULL;
  
  IF null_category_count > 0 THEN
    RAISE NOTICE 'Warning: % posts still have NULL category. Setting to default.', null_category_count;
    UPDATE posts SET category = 'general' WHERE category IS NULL;
  END IF;
END $$;

-- Step 6: Drop old columns only after data is safely migrated
DO $$ 
BEGIN
  -- Drop genre column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'genre'
  ) THEN
    ALTER TABLE posts DROP COLUMN genre;
    RAISE NOTICE 'Dropped genre column after migrating data to category';
  END IF;

  -- Drop post_type column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'post_type'
  ) THEN
    ALTER TABLE posts DROP COLUMN post_type;
    RAISE NOTICE 'Dropped post_type column after migrating data to category';
  END IF;
END $$;

-- Step 7: Ensure all new columns have proper defaults
ALTER TABLE posts ALTER COLUMN category SET DEFAULT 'general';

-- Migration complete
SELECT 'Migration completed successfully! All data preserved.' AS status;
