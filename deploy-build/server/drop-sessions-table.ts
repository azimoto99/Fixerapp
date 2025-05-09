import { pool } from './db';

/**
 * Drop the sessions table if it exists to avoid the "session_pkey already exists" error
 */
async function dropSessionsTable() {
  try {
    console.log('Attempting to drop sessions table...');
    
    // Drop the table if it exists 
    await pool.query('DROP TABLE IF EXISTS session');
    await pool.query('DROP TABLE IF EXISTS sessions');
    
    console.log('Sessions table dropped successfully');
  } catch (err) {
    console.error('Error dropping sessions table:', err);
  } finally {
    // Close the pool since this is a one-time script
    await pool.end();
  }
}

// Run the function
dropSessionsTable().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});