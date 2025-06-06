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

// Create a pool for database connections with enhanced resilience
let pool: Pool | undefined = undefined;
let db: any = undefined;
let client: any = undefined;
let connectionCount = 0; // Track connection count for logging

if (process.env.SUPABASE_DATABASE_URL) {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  const dbUrl = new URL(connectionString);
  
  // Create the connection pool with improved settings
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    min: 5, // Maintain minimum connections
    idleTimeoutMillis: 60000, // Increased idle timeout
    connectionTimeoutMillis: 15000, // Increased connection timeout
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // Add error handling for the pool
  pool.on('error', (err) => {
    console.error('❌ Database pool error:', err);
    
    // Handle specific error cases
    if (err.message.includes('termination') || err.message.includes('connection')) {
      console.log('🔄 Database connection lost, attempting to reconnect...');
      // The pool will automatically attempt to reconnect
    }
  });

  pool.on('connect', (client) => {
    // Only log first few connections to avoid spam
    if (connectionCount < 3) {
      console.log(`✅ Database client connected (${connectionCount + 1})`);
    }
    connectionCount++;
    
    client.on('error', (err) => {
      console.error('❌ Database client error:', err);
    });
  });

  // Create the postgres client with enhanced configuration
  client = postgres({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: dbUrl.pathname.slice(1),
    username: dbUrl.username,
    password: dbUrl.password,
    ssl: 'require',
    max: 10,
    idle_timeout: 30, // Increased idle timeout
    connect_timeout: 15, // Increased connect timeout
    connection: {
      application_name: 'fixer-app',
    },
    onnotice: () => {}, // Suppress notices
    transform: {
      undefined: null
    }
  });
  
  db = drizzle(client, { schema });
}
export { db, client, pool };