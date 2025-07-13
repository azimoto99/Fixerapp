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

// Single database connection using postgres-js client only
let db: any = undefined;
let client: any = undefined;
let pool: Pool | undefined = undefined; // Keep for session store only

if (process.env.SUPABASE_DATABASE_URL) {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  const dbUrl = new URL(connectionString);
  
  // Create minimal pool ONLY for session store
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5, // Minimal connections for session store only
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 8000,
    allowExitOnIdle: false,
  });

  // Create the main postgres client for all queries
  client = postgres({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: dbUrl.pathname.slice(1),
    username: dbUrl.username,
    password: dbUrl.password,
    ssl: 'require',
    max: 15, // All connections go through this
    idle_timeout: 20,
    connect_timeout: 10,
    statement_timeout: 30000,
    connection: {
      application_name: 'fixer-app',
      statement_timeout: '30s',
    },
    onnotice: () => {},
    transform: {
      undefined: null
    },
    onparameter: () => {},
    debug: false
  });
  
  db = drizzle(client, { schema });
}
export { db, client, pool };