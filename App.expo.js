// App.expo.js - Special Expo entry point for Expo Go

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";

// Get the current Replit URL
const getWebUrl = () => {
  if (process.env.EXPO_PUBLIC_REPLIT_URL) {
    return process.env.EXPO_PUBLIC_REPLIT_URL;
  }
  return "https://fixer-app.replit.app";
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const webUrl = getWebUrl();

  useEffect(() => {
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
          <Text style={styles.logo}>🔧 Fixer</Text>
          <Text style={styles.subtitle}>Mobile Companion</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              Connecting to Fixer web app...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHelp}>
              Make sure your Replit server is running and try again.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setLoading(true)}
            >
              <Text style={styles.buttonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Successfully connected to Fixer web app!
            </Text>
            <TouchableOpacity style={styles.button} onPress={openWebApp}>
              <Text style={styles.buttonText}>Open Web App</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Why am I seeing this screen?</Text>
          <Text style={styles.infoText}>
            Fixer is primarily a web application with special mobile
            capabilities. This native Expo wrapper helps you connect to the web
            version with integrated mobile features.
          </Text>

          <Text style={styles.infoTitle}>How to use Fixer:</Text>
          <Text style={styles.infoText}>
            1. Tap the "Open Web App" button to access the full Fixer
            application.
          </Text>
          <Text style={styles.infoText}>
            2. Most functionality will work directly in your mobile browser.
          </Text>
          <Text style={styles.infoText}>
            3. Certain features like notifications and location services will
            work better when you add the web app to your home screen.
          </Text>
        </View>
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>
            Version 1.0.0 {__DEV__ ? "(Dev Mode)" : ""}
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
    backgroundColor: "#f7f7f7",
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginTop: 8,
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#333",
  },
  errorContainer: {
    padding: 20,
    backgroundColor: "#ffe6e6",
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#cc0000",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#990000",
    textAlign: "center",
  },
  errorHelp: {
    fontSize: 14,
    color: "#660000",
    textAlign: "center",
    marginTop: 10,
  },
  successContainer: {
    padding: 20,
    backgroundColor: "#e6ffe6",
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  successText: {
    fontSize: 16,
    color: "#006600",
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  infoContainer: {
    marginTop: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  versionInfo: {
    marginTop: 40,
    alignItems: "center",
  },
  versionText: {
    fontSize: 14,
    color: "#999",
  },
});
