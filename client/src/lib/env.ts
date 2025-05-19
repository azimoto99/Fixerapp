/**
 * Environment variable utility that works across web and mobile environments
 */

// For React Native environment
let envFromNative: Record<string, string> = {};

try {
  // Dynamic import to avoid issues with webpack
  const env = require('@env');
  envFromNative = env || {};
} catch (e) {
  // Silently fail if @env is not available (web environment)
}

// Define a type for the global namespace extension
declare global {
  interface Window {
    __ENV?: Record<string, string>;
  }
  
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
  
  var __ENV: Record<string, string> | undefined;
}

/**
 * Gets an environment variable that works in both React Native and web
 * @param key The environment variable key
 * @param defaultValue Optional default value if not found
 * @returns The environment variable value
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  // Try React Native env first
  if (envFromNative && envFromNative[key]) {
    return envFromNative[key];
  }
  
  // For web environment, try import.meta.env
  if (typeof window !== 'undefined' && 
      typeof import.meta !== 'undefined' && 
      'env' in import.meta && 
      import.meta.env && 
      key in import.meta.env) {
    return (import.meta.env as Record<string, string>)[key];
  }
  
  // Fallback to process.env for Node.js or SSR
  if (typeof process !== 'undefined' && 
      process.env && 
      key in process.env && 
      process.env[key]) {
    return process.env[key] as string;
  }
  
  // Last resort: check global object (for RN global variables)
  if (typeof global !== 'undefined' && 
      '__ENV' in global && 
      global.__ENV && 
      key in global.__ENV) {
    return global.__ENV[key];
  }
  
  return defaultValue;
}

// Export specific environment variables
export const STRIPE_PUBLIC_KEY = getEnv('VITE_STRIPE_PUBLIC_KEY', '');
export const APP_URL = getEnv('APP_URL', 'https://fixer.replit.app');