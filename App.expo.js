// App.expo.js - Special Expo entry point for native builds
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import App from './client/src/App';

// Production vs Development check
const isProduction = process.env.NODE_ENV === 'production';

export function ExpoApp() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        // Any initialization logic here
        setIsReady(true);
      } catch (err) {
        console.error('App initialization error:', err);
        setError(err.message);
      }
    };

    initApp();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <App />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  }
});

// Register the root component
registerRootComponent(ExpoApp);