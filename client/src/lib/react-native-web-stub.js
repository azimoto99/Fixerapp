// React Native web stub for web-only builds
// This provides mock implementations of React Native components for web environment

export const Platform = {
  OS: 'web',
  select: (obj) => obj.web || obj.default
};

export const View = 'div';
export const Text = 'span';
export const StyleSheet = {
  create: (styles) => styles
};

// Export any other React Native components you need to stub
export default {
  Platform,
  View,
  Text,
  StyleSheet
};