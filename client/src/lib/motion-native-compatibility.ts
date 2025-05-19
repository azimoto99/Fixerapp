/**
 * Motion compatibility layer for React Native
 * 
 * This module provides React Native compatible versions of framer-motion components
 * by creating simple wrapper components that work properly in both web and native environments.
 */

import React from 'react';
import { Platform, View, Text } from 'react-native';

// For web, export the real components
// For native, export simple wrappers that pass through props
export const motion = {
  div: Platform.OS === 'web' 
    ? require('framer-motion').motion.div 
    : (props: any) => React.createElement(View, props),
    
  span: Platform.OS === 'web'
    ? require('framer-motion').motion.span
    : (props: any) => React.createElement(Text, props),
    
  button: Platform.OS === 'web'
    ? require('framer-motion').motion.button
    : (props: any) => {
        // Extract motion props that would cause issues in RN
        const { whileHover, whileTap, ...otherProps } = props;
        return React.createElement(View, otherProps);
      },
    
  // Add other motion components as needed
};

// AnimatePresence compatibility
export const AnimatePresence = Platform.OS === 'web'
  ? require('framer-motion').AnimatePresence
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Export animation helpers as no-ops for native
export const useAnimation = Platform.OS === 'web'
  ? require('framer-motion').useAnimation
  : () => ({
      start: () => Promise.resolve(),
      stop: () => {},
      set: () => {},
    });

// Spring animation config
export const spring = Platform.OS === 'web'
  ? require('framer-motion').spring
  : (config: any) => config;

// Animation variants
export function useAnimationVariants(variants: any) {
  return Platform.OS === 'web' ? variants : {};
}