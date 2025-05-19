/**
 * Metro configuration for Expo
 * This extends the Expo Metro config for compatibility
 */

// Import Expo's Metro configuration
const { getDefaultConfig } = require('@expo/metro-config');

// Get the default configuration
const defaultConfig = getDefaultConfig(__dirname);

// Extend default config with our custom settings
const config = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    assetExts: [
      ...defaultConfig.resolver.assetExts,
      // Audio
      'mp3', 'wav', 'ogg',
      // Video
      'mp4', 'avi', 'mov', 'wmv', 
      // Other
      'xml', 'pdf'
    ],
    sourceExts: [
      ...defaultConfig.resolver.sourceExts,
      'md', 'mdx'
    ],
  },
  watchFolders: [
    ...defaultConfig.watchFolders,
    __dirname + '/client/src',
    __dirname + '/shared',
  ],
};

module.exports = config;