// Dynamic Expo config
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = ({ config }) => {
  // Get configuration from app.json
  const appConfig = { ...config };
  
  // For production builds where we use EAS, make sure we don't
  // have conflicts with native projects
  if (process.env.EAS_BUILD_PLATFORM) {
    // Remove properties that would be managed by the native project
    delete appConfig.orientation;
    delete appConfig.icon;
    delete appConfig.userInterfaceStyle;
    delete appConfig.splash;
    delete appConfig.ios;
    delete appConfig.android;
    delete appConfig.scheme;
    delete appConfig.primaryColor;
    delete appConfig.notification;
    delete appConfig.plugins;
  }
  
  return withAndroidManifest(appConfig, config => {
    return config;
  });
};
