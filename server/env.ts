import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import fs from 'fs';
import dns from 'node:dns';

// Create __dirname for ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prefer IPv4 when resolving hostnames to avoid IPv6 connection issues
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (err) {
  // Node < 17 may not support this; ignore error
}

// Determine the environment - don't override if already set
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env file
// Look for .env in both the server directory and project root
const serverEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(process.cwd(), '.env');
const envPath = fs.existsSync(serverEnvPath) ? serverEnvPath : rootEnvPath;
const envExists = fs.existsSync(envPath);

if (!envExists && !isProduction) {
  console.error('Error: .env file not found in development mode');
  console.error('Looked in:', serverEnvPath);
  console.error('And:', rootEnvPath);
  process.exit(1);
}

// Load environment variables
const result = config({ path: envPath });

if (result.error && !isProduction) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Only set NODE_ENV if it's not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = isProduction ? 'production' : 'development';
}

// Verify required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_DATABASE_URL',
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_MAPBOX_ACCESS_TOKEN'
];

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`- ${varName}`));
  
  if (isProduction) {
    console.error('Please set these environment variables in your production environment.');
  } else {
    console.error('Please add these variables to your .env file.');
  }
  
  process.exit(1);
}

// Log environment status
console.log('Environment check:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Not set'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set'}`);
console.log(`SUPABASE_DATABASE_URL: ${process.env.SUPABASE_DATABASE_URL ? 'Set' : 'Not set'}`);
console.log(`VITE_STRIPE_PUBLIC_KEY: ${process.env.VITE_STRIPE_PUBLIC_KEY ? 'Set' : 'Not set'}`);
console.log(`VITE_MAPBOX_ACCESS_TOKEN: ${process.env.VITE_MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set'}`);

export default process.env; 