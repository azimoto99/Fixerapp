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
  
  // Create the connection pool with optimized settings for production
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 15, // Reduced max connections to prevent overwhelming the database
    min: 3, // Maintain minimum connections
    idleTimeoutMillis: 30000, // 30 seconds - shorter idle timeout
    connectionTimeoutMillis: 10000, // 10 seconds connection timeout
    acquireTimeoutMillis: 8000, // 8 seconds to acquire connection
    allowExitOnIdle: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
    // Add statement timeout to prevent long-running queries
    statement_timeout: 30000, // 30 seconds max for any statement
    query_timeout: 25000, // 25 seconds max for queries
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

  // Create the postgres client with optimized configuration
  client = postgres({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: dbUrl.pathname.slice(1),
    username: dbUrl.username,
    password: dbUrl.password,
    ssl: 'require',
    max: 8, // Reduced max connections
    idle_timeout: 20, // Shorter idle timeout
    connect_timeout: 10, // Shorter connect timeout
    statement_timeout: 25000, // 25 seconds statement timeout
    query_timeout: 20000, // 20 seconds query timeout
    connection: {
      application_name: 'fixer-app',
      statement_timeout: '25s', // PostgreSQL setting
    },
    onnotice: () => {}, // Suppress notices
    transform: {
      undefined: null
    },
    // Add error handling
    onparameter: () => {},
    debug: false
  });
  
  db = drizzle(client, { schema });
}
export { db, client, pool };