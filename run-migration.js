import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runPayPalMigration() {
  console.log('🔄 Starting PayPal migration...');
  
  // Read the migration SQL file
  const migrationPath = path.join(__dirname, 'migrations', 'replace-stripe-with-paypal.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set your DATABASE_URL in .env file');
    process.exit(1);
  }
  
  console.log('📋 Migration steps:');
  console.log('1. Add PayPal fields to all tables');
  console.log('2. Migrate existing Square data to PayPal fields');
  console.log('3. Update payment methods from "square" to "paypal"');
  console.log('4. Remove Square fields from database');
  console.log('5. Create indexes for better performance');
  console.log('6. Log migration completion');
  
  // Run the migration using psql
  exec(`psql "${process.env.DATABASE_URL}" -c "${migrationSQL}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Migration failed:', error);
      console.error('Error output:', stderr);
      process.exit(1);
    }
    
    console.log('✅ PayPal migration completed successfully!');
    console.log('📊 Migration output:', stdout);
    
    // Also run drizzle-kit push to sync any schema changes
    console.log('🔄 Running drizzle-kit push to sync schema...');
    exec('npx drizzle-kit push', (error, stdout, stderr) => {
      if (error) {
        console.warn('⚠️  Drizzle schema sync had issues:', error);
        console.warn('This is usually normal after manual SQL migrations');
      } else {
        console.log('✅ Schema sync completed');
      }
      
      console.log('🎉 Migration process completed!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Test your PayPal integration');
      console.log('2. Update any remaining references to Square in your code');
      console.log('3. Configure PayPal environment variables');
      process.exit(0);
    });
  });
}

// Run the migration
runPayPalMigration().catch(console.error);