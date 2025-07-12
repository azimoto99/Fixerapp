import { defineConfig } from "drizzle-kit";

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error("SUPABASE_DATABASE_URL must be set");
}

// Parse the database URL to add connection parameters
const dbUrl = new URL(process.env.SUPABASE_DATABASE_URL);

// Check if we're in a deployment environment (Render, etc.)
const isDeployment = process.env.RENDER || process.env.NODE_ENV === 'production';
const isProduction = process.env.NODE_ENV === 'production';

// Set connection timeouts
dbUrl.searchParams.set('statement_timeout', '60000');
dbUrl.searchParams.set('query_timeout', '60000');
dbUrl.searchParams.set('connect_timeout', '30');

// Configure SSL for Supabase
dbUrl.searchParams.set('sslmode', 'require');

console.log('🔧 Drizzle Config Info:');
console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`- Is Deployment: ${isDeployment}`);
console.log(`- Database Host: ${dbUrl.hostname}`);

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl.toString(),
    // SSL configuration for Supabase
    ssl: {
      rejectUnauthorized: false // Allow self-signed certificates for Supabase
    }
  },
  introspect: {
    casing: "camel",
  },
  verbose: true,
  strict: true,
  // Add migration configuration
  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations__',
    schema: 'public',
  },
});
