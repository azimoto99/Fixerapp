// This module provides a way to access environment variables
// that works in the Vite web environment

// Web environment - use Vite's import.meta.env
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

// Export other environment variables as needed

// For use in components that need the full environment
export const getEnv = () => ({
  STRIPE_PUBLIC_KEY,
  // Add other variables here
});