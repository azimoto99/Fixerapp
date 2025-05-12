// Learn more https://docs.expo.io/guides/customizing-metro
// This file uses CommonJS format (.cjs extension) to avoid issues with ES modules
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add any custom Metro configurations here
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg');

// Allow importing from the client directory
config.watchFolders = [
  ...config.watchFolders || [],
  './client',
];

// Export the configuration
module.exports = config;