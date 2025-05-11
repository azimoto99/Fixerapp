import { runMigration } from '../migrations/001_add_missing_columns';

async function runAllMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Run each migration in order
    await runMigration();
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Execute migrations
runAllMigrations()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });