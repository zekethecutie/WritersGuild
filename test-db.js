
const postgres = require('postgres');

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    return;
  }
  
  console.log('🔗 DATABASE_URL found:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
  
  try {
    const client = postgres(process.env.DATABASE_URL, {
      ssl: { rejectUnauthorized: false },
      idle_timeout: 20,
      max_lifetime: 60 * 30
    });
    
    // Test basic connection
    const result = await client`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Test if sessions table exists
    try {
      const tables = await client`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      console.log('📋 Available tables:', tables.map(t => t.table_name));
    } catch (error) {
      console.log('⚠️  Could not list tables:', error.message);
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('📋 Error details:', {
      code: error.code,
      severity: error.severity,
      detail: error.detail
    });
  }
}

testConnection();
