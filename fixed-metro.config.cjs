/**
 * Extremely minimal Metro configuration
 * Designed to work with Expo in web-only mode 
 * without any other dependencies
 */

// Ultra minimal Metro configuration
const config = {
  resolver: {
    assetExts: [
      // Default
      'bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp',
      // Audio
      'mp3', 'wav', 'ogg',
      // Video
      'mp4', 'avi', 'mov', 'wmv', 
      // Other
      'ttf', 'otf', 'xml', 'pdf', 'json'
    ],
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
  },
  transformer: {
    // We've installed this dependency
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  },
  watchFolders: [
    // Add paths to watch
    __dirname,
    __dirname + '/client/src',
    __dirname + '/shared',
  ],
  // Server configuration
  server: {
    port: 8081,
  },
};

module.exports = config;