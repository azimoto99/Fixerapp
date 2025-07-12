// This module provides a way to access environment variables
// that works in the Vite web environment

// Payment processing has been removed - only Mapbox is required now
export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// For use in components that need the full environment
export const getEnv = () => ({
  MAPBOX_ACCESS_TOKEN,
  // Add other variables here
});