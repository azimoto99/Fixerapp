import { addStripeTransfersEnabledColumn } from './add-stripe-transfers-enabled';

async function runAllMigrations() {
  console.log('Running all database migrations...');
  
  try {
    // Run migrations in sequence
    await addStripeTransfersEnabledColumn();
    
    // Add more migrations here as needed
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration process failed:', error);
    throw error;
  }
}

// In ES modules, we can use import.meta.url to check if this is the main module
// This is a workaround since require.main === module doesn't work in ES modules
const isMainModule = import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
  runAllMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runAllMigrations };