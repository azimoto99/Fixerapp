import { runMigration as runMigration001 } from '../migrations/001_add_missing_columns.js';
import { runMigration as runMigration002 } from '../migrations/002_add_payment_earnings_columns.js';
import { runMigration as runMigration003 } from '../migrations/003_add_job_workflow_columns.js';
import { runMigration as runMigration004 } from '../migrations/004_add_shift_time_columns.js';
import { runMigration as runMigration005 } from '../migrations/005_add_marker_color_column.js';

async function runAllMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Run each migration in order
    await runMigration001();
    await runMigration002();
    await runMigration003();
    await runMigration004();
    await runMigration005();
    
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