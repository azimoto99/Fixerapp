/**
 * Cross-platform compatibility utilities
 * 
 * This module provides utilities and components that work across
 * both web and React Native environments without dependency issues.
 */
import React from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';

// Safe way to determine platform
export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;

// Simple animated button that works cross-platform
export const AnimatedButton = ({ 
  onPress, 
  children, 
  style = {}
}: { 
  onPress: () => void, 
  children: React.ReactNode,
  style?: any 
}) => {
  if (isWeb) {
    return (
      <button 
        onClick={onPress} 
        className="animated-button"
        style={style}
      >
        {children}
      </button>
    );
  } else {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        style={style}
      >
        {children}
      </TouchableOpacity>
    );
  }
};

// Platform-specific container component
export const Container = ({ 
  children, 
  style = {} 
}: { 
  children: React.ReactNode,
  style?: any 
}) => {
  if (isWeb) {
    return (
      <div style={style}>
        {children}
      </div>
    );
  } else {
    return (
      <View style={style}>
        {children}
      </View>
    );
  }
};

// Platform-specific text component
export const CrossText = ({ 
  children, 
  style = {} 
}: { 
  children: React.ReactNode,
  style?: any 
}) => {
  if (isWeb) {
    return (
      <span style={style}>
        {children}
      </span>
    );
  } else {
    return (
      <Text style={style}>
        {children}
      </Text>
    );
  }
};

// Platform-specific styling helpers
export const createCrossPlatformStyles = (styles: any) => {
  return isWeb ? styles : styles;
};