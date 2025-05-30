/**
 * This script ensures the sessions table exists with the proper structure
 * Run this before starting the application
 */

import { client } from './db';
import { config } from 'dotenv';
config();

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error('SUPABASE_DATABASE_URL must be set in your environment');
}

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
    
    const result = await client.unsafe(checkTable);
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
    
    await client.unsafe(createTable);
    console.log('Sessions table created successfully');
  } catch (error) {
    console.error('Error creating sessions table:', error);
    throw error; // Re-throw to handle it in the main application
  }
}

// Export the function for use in other files
export default createSessionsTable;