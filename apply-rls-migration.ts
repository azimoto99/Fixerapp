import './server/env';  // Load environment variables
import { readFileSync } from 'fs';
import { client } from './server/db';

async function runRlsMigration() {
  try {
    console.log('🔒 Starting RLS migration...');
    
    // Read the quick migration file
    const migrationSql = readFileSync('./migrations/quick-rls-fix.sql', 'utf8');
    
    // Execute the entire migration as a single unsafe query
    // This handles multi-statement SQL properly
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
    await client.end();
  }
}

runRlsMigration().catch(console.error);