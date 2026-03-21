import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const isPostgresUrl = (value: string) => /^postgres(ql)?:\/\//i.test(value);

// Default to development only when NODE_ENV is unset.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Load environment variables from .env when the file exists locally.
// Platforms like Render provide vars directly via the process environment.
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const result = config({ path: envPath });

  if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
  }
}

// Verify required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_DATABASE_URL',
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_MAPBOX_ACCESS_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`- ${varName}`));
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseDbUrl = process.env.SUPABASE_DATABASE_URL || '';

if (isPostgresUrl(supabaseUrl) && isHttpUrl(supabaseDbUrl)) {
  console.error('Invalid environment configuration: SUPABASE_URL and SUPABASE_DATABASE_URL appear to be swapped.');
  console.error('SUPABASE_URL should be the HTTPS project URL, and SUPABASE_DATABASE_URL should be the PostgreSQL connection string.');
  process.exit(1);
}

if (!isHttpUrl(supabaseUrl)) {
  console.error('Invalid SUPABASE_URL: expected an HTTPS URL like https://your-project.supabase.co');
  process.exit(1);
}

if (!isPostgresUrl(supabaseDbUrl)) {
  console.error('Invalid SUPABASE_DATABASE_URL: expected a PostgreSQL connection string starting with postgres:// or postgresql://');
  process.exit(1);
}

export default process.env; 
