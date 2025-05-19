module.exports = ({ config }) => {
  const appConfig = { ...config };

  // Essential Android configuration
  appConfig.android = {
    ...appConfig.android,
    package: 'com.fixer.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    softwareKeyboardLayoutMode: "pan",
    allowBackup: true,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION'
    ]
  };

  return appConfig;
};