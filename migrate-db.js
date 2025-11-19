const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Add missing columns to posts table
    await db.execute(sql`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS excerpt TEXT,
      ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
      ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMP
    `);
    
    console.log('✅ Successfully added new columns to posts table');
    
    // Check if old columns exist and drop them if they do
    try {
      await db.execute(sql`ALTER TABLE posts DROP COLUMN IF EXISTS post_type`);
      await db.execute(sql`ALTER TABLE posts DROP COLUMN IF EXISTS genre`);
      console.log('✅ Successfully removed old columns from posts table');
    } catch (e) {
      console.log('Note: Old columns may not exist, which is fine');
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
