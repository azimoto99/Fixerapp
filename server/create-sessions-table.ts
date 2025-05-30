/**
 * This script ensures the sessions table exists with the proper structure
 * Run this before starting the application
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import dns from 'dns/promises';
config();

async function createSessionsTable() {
  try {
    // Parse the connection URL
    const url = new URL(process.env.SUPABASE_DATABASE_URL!);
    
    // Try to resolve hostname to IPv4
    let host = url.hostname;
    try {
      const addresses = await dns.resolve4(url.hostname);
      if (addresses.length > 0) {
        host = addresses[0]; // Use the first IPv4 address
        console.log(`Resolved ${url.hostname} to IPv4: ${host}`);
      }
    } catch (err) {
      console.warn('Could not resolve to IPv4, using original hostname:', err);
    }
    
    // Create pool with explicit connection properties
    const pool = new Pool({
      host: host,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading slash
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false }
    });
    
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
    
    await pool.end();
  } catch (error) {
    console.error('Error creating sessions table:', error);
    throw error;
  }
}

export default createSessionsTable;