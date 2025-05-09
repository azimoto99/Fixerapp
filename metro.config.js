// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add any custom Metro configurations here
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg');

// Allow importing from the client directory
config.watchFolders = [
  ...config.watchFolders || [],
  './client',
];

module.exports = config;