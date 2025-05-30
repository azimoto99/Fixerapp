import path from 'path';
import { config } from 'dotenv';

// Force development mode if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Load environment variables from .env file
const result = config({ path: path.resolve(process.cwd(), '.env') });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Ensure we're in development mode
process.env.NODE_ENV = 'development';

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

export default process.env; 