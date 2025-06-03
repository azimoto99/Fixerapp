import './env';  // This must be the first import
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY must be set. Did you forget to configure Supabase?",
  );
}

// Create Supabase client with retry logic
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-application-name': 'fixer-app',
      },
    },
  }
);

// Create a pool for database connections
let pool: Pool | undefined = undefined;
let db: any = undefined;
let client: any = undefined;

if (process.env.SUPABASE_DATABASE_URL) {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  const dbUrl = new URL(connectionString);
  
  // Create the connection pool with more lenient timeouts for Render
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 60000, // Increased from 30000
    connectionTimeoutMillis: 30000, // Increased from 10000
  });

  // Add error handling for the pool
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Create the postgres client with more lenient timeouts
  client = postgres({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: dbUrl.pathname.slice(1),
    username: dbUrl.username,
    password: dbUrl.password,
    ssl: 'require',
    max: 10,
    idle_timeout: 60, // Increased from 20
    connect_timeout: 30, // Increased from 10
    connection: {
      application_name: 'fixer-app',
    }
  });
  
  db = drizzle(client, { schema });

  // Test the connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection test failed:', err);
    } else {
      console.log('Database connection test successful');
    }
  });
}

export { db, client, pool };