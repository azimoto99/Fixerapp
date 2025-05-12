/**
 * This file ensures React is properly loaded in all component files
 * Import this at the top of any component file to guarantee React is defined
 */
import * as React from 'react';

// Make React available globally
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

export default React;