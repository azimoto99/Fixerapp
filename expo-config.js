module.exports = {
  name: 'Fixer',
  slug: 'fixer-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './attached_assets/app_icon.png',
  splash: {
    image: './attached_assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fixerapp.app'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './attached_assets/adaptive_icon.png',
      backgroundColor: '#FFFFFF'
    },
    package: 'com.fixerapp.app'
  },
  web: {
    favicon: './attached_assets/favicon.png'
  },
  extra: {
    eas: {
      projectId: 'fixer-app'
    }
  }
}