/**
 * This script ensures the sessions table exists with the proper structure
 * Run this before starting the application
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
config();

// Create a pool with IPv4 forcing
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  // Ensure IPv4 lookup preference
  host: new URL(process.env.SUPABASE_DATABASE_URL!).hostname,
  port: 5432,
  family: 4 as 4
});

async function createSessionsTable() {
  try {
    // Create the sessions table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log('Sessions table created or already exists');
  } catch (error) {
    console.error('Error creating sessions table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export default createSessionsTable;