/**
 * This script ensures the sessions table exists with the proper structure
 * Run this before starting the application
 */

import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';
config();
const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL });

async function createSessionsTable() {
  try {
    console.log('Checking and creating sessions table if needed...');
    
    // First check if the table exists
    const checkTable = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'sessions'
      );
    `;
    
    const result = await pool.query(checkTable);
    const tableExists = result[0].exists;
    
    if (tableExists) {
      console.log('Sessions table already exists');
      return;
    }
    
    // Create the sessions table with proper structure for connect-pg-simple
    const createTable = `
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
    `;
    
    await pool.query(createTable);
    console.log('Sessions table created successfully');
  } catch (error) {
    console.error('Error creating sessions table:', error);
  }
}

// Execute the function
createSessionsTable().catch(console.error);

// Export the function for use in other files
export default createSessionsTable;