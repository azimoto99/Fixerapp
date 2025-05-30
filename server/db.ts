import './env';  // This must be the first import
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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

// Create PostgreSQL connection for Drizzle with retry logic
const connectionString = process.env.SUPABASE_DATABASE_URL!;

// IMPORTANT: Use Supabase's connection pooler URL (port 6543) instead of direct connection (port 5432)
// to avoid IPv6 issues. The pooler URL looks like:
// postgresql://postgres.xxxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres
// Make sure your SUPABASE_DATABASE_URL uses the pooler endpoint

// Parse connection URL
const dbUrl = new URL(connectionString);

// Configure postgres client with parsed parameters
const client = postgres({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  username: dbUrl.username,
  password: dbUrl.password,
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    application_name: 'fixer-app',
  }
});

// Export the database instance
export const db = drizzle(client, { schema });

// Re-export the client for other modules that need it
export { client };