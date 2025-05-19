// App.expo.js - Special Expo entry point for Expo Go

import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';

// Get the current Replit URL
const getWebUrl = () => {
  if (process.env.EXPO_PUBLIC_REPLIT_URL) {
    return process.env.EXPO_PUBLIC_REPLIT_URL;
  }
  // Fallback URL - replace with your specific Repl URL
  return 'https://fixer-app.replit.app';
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const webUrl = getWebUrl();

  useEffect(() => {
    // Check if the web app is available
    const checkWebApp = async () => {
      try {
        const response = await fetch(webUrl);
        if (response.ok) {
          setLoading(false);
        } else {
          setError(`Server returned ${response.status}`);
        }
      } catch (err) {
        setError(`Failed to connect: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    checkWebApp();
  }, [webUrl]);

  const openWebApp = () => {
    Linking.openURL(webUrl);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('./logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.logo}>Fixer</Text>
          </View>
          <Text style={styles.subtitle}>Mobile Companion</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Connecting to Fixer web app...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHelp}>
              Make sure your Replit server is running and try again.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => setLoading(true)}>
              <Text style={styles.buttonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Successfully connected to Fixer web app!</Text>
            <TouchableOpacity style={styles.button} onPress={openWebApp}>
              <Text style={styles.buttonText}>Open Web App</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Why am I seeing this screen?</Text>
          <Text style={styles.infoText}>
            Fixer is primarily a web application with special mobile capabilities. This native Expo wrapper
            helps you connect to the web version with integrated mobile features.
          </Text>
          
          <Text style={styles.infoTitle}>How to use Fixer:</Text>
          <Text style={styles.infoText}>
            1. Tap the "Open Web App" button to access the full Fixer application.
          </Text>
          <Text style={styles.infoText}>
            2. Most functionality will work directly in your mobile browser.
          </Text>
          <Text style={styles.infoText}>
            3. Certain features like notifications and location services will work better when you add the
            web app to your home screen.
          </Text>
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  logoImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHelp: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  successContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34c759',
  },
  successText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
});