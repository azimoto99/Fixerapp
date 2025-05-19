/**
 * Motion compatibility layer for React Native
 * 
 * This module provides React Native compatible versions of framer-motion components
 * by creating simple wrapper components that work properly in both web and native environments.
 */

import React from 'react';
import { Platform, View, Text } from 'react-native';

// Determine if we're in a web environment
const isWeb = Platform.OS === 'web';

// Import framer-motion only in web environment to avoid errors
let framerMotion: any = null;
if (isWeb) {
  try {
    framerMotion = require('framer-motion');
  } catch (e) {
    console.warn('Framer Motion not available');
  }
}

// For web, export the real components
// For native, export simple wrappers that pass through props
export const motion = {
  div: isWeb && framerMotion
    ? framerMotion.motion.div 
    : (props: any) => React.createElement(View, props),
    
  span: isWeb && framerMotion
    ? framerMotion.motion.span
    : (props: any) => React.createElement(Text, props),
    
  button: isWeb && framerMotion
    ? framerMotion.motion.button
    : ((props: any) => {
        // Extract motion props that would cause issues in RN
        const { whileHover, whileTap, ...otherProps } = props;
        return React.createElement(View, otherProps);
      }),
    
  // Add other motion components as needed
};

// AnimatePresence compatibility
export const AnimatePresence: React.FC<{children?: React.ReactNode}> = isWeb && framerMotion
  ? framerMotion.AnimatePresence
  : ({ children }) => {
      return React.createElement(React.Fragment, null, children);
    };

// Export animation helpers as no-ops for native
export const useAnimation = isWeb && framerMotion
  ? framerMotion.useAnimation
  : () => ({
      start: () => Promise.resolve(),
      stop: () => {},
      set: () => {},
    });

// Spring animation config
export const spring = isWeb && framerMotion
  ? framerMotion.spring
  : (config: any) => config;

// Animation variants
export function useAnimationVariants(variants: any) {
  return isWeb ? variants : {};
}