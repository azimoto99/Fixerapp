// This is a shim file that just imports the actual metro.config.cjs
// to maintain compatibility with any scripts looking for metro.config.js

// Re-export the content from metro.config.cjs
export { default } from './metro.config.cjs';