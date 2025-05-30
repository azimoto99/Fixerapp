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

// Configure postgres client with retry logic and better error handling
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
  max_lifetime: 60 * 30, // Maximum lifetime of a connection in seconds
  prepare: false, // Disable prepared statements for better compatibility
  ssl: 'require', // Require SSL for security
  onnotice: () => {}, // Suppress notice messages
  onparameter: () => {}, // Suppress parameter messages
  debug: process.env.NODE_ENV === 'development', // Enable debug logging in development
  connection: {
    application_name: 'fixer-app',
  },
  // Force IPv4
  host: new URL(connectionString).hostname,
  port: 5432,
  family: 4, // Force IPv4
});

// Export the database instance
export const db = drizzle(client, { schema });

// Re-export the client for other modules that need it
export { client };

// Add connection error handling
client.on('error', (err) => {
  console.error('Database connection error:', err);
  // Attempt to reconnect
  setTimeout(() => {
    console.log('Attempting to reconnect to database...');
    client.end().then(() => {
      // The client will automatically attempt to reconnect
    }).catch(console.error);
  }, 5000); // Wait 5 seconds before attempting to reconnect
});