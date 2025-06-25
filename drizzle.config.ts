import { defineConfig } from "drizzle-kit";

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error("SUPABASE_DATABASE_URL must be set");
}

// Parse the database URL to add connection parameters
const dbUrl = new URL(process.env.SUPABASE_DATABASE_URL);
dbUrl.searchParams.set('statement_timeout', '60000');
dbUrl.searchParams.set('query_timeout', '60000');
dbUrl.searchParams.set('connect_timeout', '30');

// Use SSL for production, disable for development
const isProduction = process.env.NODE_ENV === 'production';
dbUrl.searchParams.set('sslmode', isProduction ? 'require' : 'disable');

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl.toString(),
    // For production, handle SSL properly
    ...(isProduction && {
      ssl: {
        rejectUnauthorized: false // Set to true if you have proper certificates
      }
    })
  },
  introspect: {
    casing: "camel",
  },
  verbose: true,
  strict: true,
});
