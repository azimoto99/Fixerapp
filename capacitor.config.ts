import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fixerapp.app',
  appName: 'Fixer',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.fixerapp.com'
  },
  android: {
    buildOptions: {
      keystorePath: 'keys/release.keystore',
      keystoreAlias: 'fixerapp',
    },
    backgroundColor: '#000000',
    overrideUserAgent: 'Fixer-App-Android'
  },
  ios: {
    backgroundColor: '#000000',
    overrideUserAgent: 'Fixer-App-iOS'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "large",
      spinnerColor: "#68D391",
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  backgroundColor: '#000000'
};

export default config;
