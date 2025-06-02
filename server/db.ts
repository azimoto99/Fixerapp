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

// Only create a Postgres client if SUPABASE_DATABASE_URL is set
let db = undefined;
let client = undefined;
if (process.env.SUPABASE_DATABASE_URL) {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  const dbUrl = new URL(connectionString);
  client = postgres({
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
  db = drizzle(client, { schema });
}
export { db, client };