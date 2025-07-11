// This module provides a way to access environment variables
// that works in the Vite web environment

// Web environment - use Vite's import.meta.env
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

// Export other environment variables as needed

// For use in components that need the full environment
export const getEnv = () => ({
  PAYPAL_CLIENT_ID,
  // Add other variables here
});