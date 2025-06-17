import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  // Server
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_DATABASE_URL: string;
  
  // Authentication
  SESSION_SECRET: string;
  
  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_CONNECT_WEBHOOK_SECRET?: string;
  
  // External APIs
  MAPBOX_ACCESS_TOKEN: string;
  
  // App URLs
  APP_URL: string;
  CLIENT_URL: string;
  
  // Email (optional)
  SENDGRID_API_KEY?: string;
  
  // File uploads
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;

  // AWS S3 Configuration
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET_NAME: string;
}

function validateEnv(): Config {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'MAPBOX_ACCESS_TOKEN',
    // Add S3 required variables
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(varName => console.error(`- ${varName}`));
    process.exit(1);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000'),
    HOST: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
    
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL!,
    
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
    STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    
    MAPBOX_ACCESS_TOKEN: process.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_ACCESS_TOKEN!,
    
    APP_URL: process.env.APP_URL || 'http://localhost:5000',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5000',
    
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'public/uploads',

    // AWS S3 Configuration
    AWS_REGION: process.env.AWS_REGION!,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!
  };
}

export const config = validateEnv();

// Log configuration (excluding secrets)
console.log('Environment configuration loaded:');
console.log(`- NODE_ENV: ${config.NODE_ENV}`);
console.log(`- PORT: ${config.PORT}`);
console.log(`- HOST: ${config.HOST}`);
console.log(`- APP_URL: ${config.APP_URL}`);
console.log(`- SUPABASE_URL: ${config.SUPABASE_URL ? 'Set' : 'Not set'}`);
console.log(`- STRIPE_SECRET_KEY: ${config.STRIPE_SECRET_KEY ? 'Set' : 'Not set'}`);
console.log(`- MAPBOX_ACCESS_TOKEN: ${config.MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set'}`);
console.log(`- STRIPE_WEBHOOK_SECRET: ${config.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set'}`);
console.log(`- AWS S3: ${config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY ? 'Configured' : 'Not configured'}`);
console.log(`- S3 BUCKET: ${config.S3_BUCKET_NAME || 'Not set'}`);