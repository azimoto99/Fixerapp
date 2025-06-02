/**
 * Metro configuration for React Native and Expo
 * Enhanced to better support Android builds
 */

const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Fix the extraNodeModules to properly resolve modules
const extraNodeModules = {
  '@shared': path.resolve(__dirname, 'shared'),
  '@client': path.resolve(__dirname, 'client'),
  '@assets': path.resolve(__dirname, 'assets'),
};

const svgConfig = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
};

module.exports = {
  ...defaultConfig,
  ...svgConfig,
  resolver: {
    ...defaultConfig.resolver,
    assetExts: [      ...defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
      'png', 'jpg', 'jpeg', 'gif', 'webp',
      'mp3', 'wav', 'ogg', 'mp4', 'mov',
      'ttf', 'otf', 'xml', 'pdf', 'json'
    ],
    sourceExts: [
      ...defaultConfig.resolver.sourceExts,
      'jsx', 'tsx', 'js', 'ts', 'json', 'md', 'mdx'
    ],
    extraNodeModules
  },
  transformer: {
    ...defaultConfig.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  watchFolders: [
    ...defaultConfig.watchFolders,
    path.resolve(__dirname, 'client/src'),
    path.resolve(__dirname, 'shared'),
    path.resolve(__dirname, 'assets'),
  ],
};