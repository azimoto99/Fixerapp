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
    enabled: true,
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
    url: 'https://u.expo.dev/fixer-app'
  },
  plugins: [
    'expo-updates'
  ],
  runtimeVersion: {
    policy: 'sdkVersion'
  },
  sdkVersion: '50.0.0',
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
    },
    'expo-updates': {
      requestHeaders: {
        'expo-channel-name': 'main'
      }
    }
  }
}