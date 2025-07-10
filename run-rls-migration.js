import { readFileSync } from 'fs';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

async function runRlsMigration() {
  let client;
  
  try {
    console.log('🔒 Starting RLS migration...');
    
    // Create database connection
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    if (!connectionString) {
      throw new Error('SUPABASE_DATABASE_URL environment variable is not set');
    }
    
    client = postgres(connectionString);
    
    // Read the migration file
    const migrationSql = readFileSync('./migrations/complete-rls-fix.sql', 'utf8');
    
    // Execute the migration
    await client.unsafe(migrationSql);
    
    console.log('✅ RLS migration completed successfully!');
    
    // Test RLS is working
    console.log('🧪 Testing RLS functionality...');
    
    // Test without context (should return 0 rows)
    await client`SELECT set_config('app.current_user_id', '0', true)`;
    const result = await client`SELECT COUNT(*) as user_count FROM users`;
    console.log('Test result - users visible without context:', result[0].user_count);
    
  } catch (error) {
    console.error('❌ RLS migration failed:', error);
    throw error;
  } finally {
    // Close the connection
    if (client) {
      await client.end();
    }
  }
}

runRlsMigration().catch(console.error);