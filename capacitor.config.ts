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
    }
  },
  plugins: {
    // Add Capacitor plugin configurations here if needed
  }
};

export default config;
