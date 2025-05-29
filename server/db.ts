import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY must be set. Did you forget to configure Supabase?",
  );
}

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create PostgreSQL connection for Drizzle
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL must be set");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { client };