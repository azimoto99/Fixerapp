// This script modifies the vite.config.ts to work without Expo/webpack dependencies
// Run this before deploying

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the current vite.config.ts
const viteConfigPath = path.resolve(__dirname, 'vite.config.ts');
let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

// Replace the content with a simplified version that doesn't depend on Expo
const newViteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
`;

// Write the modified version
fs.writeFileSync(viteConfigPath + '.bak', viteConfig, 'utf8'); // Backup original
fs.writeFileSync(viteConfigPath, newViteConfig, 'utf8');

console.log('✅ Successfully modified vite.config.ts for deployment');
console.log('Original saved as vite.config.ts.bak');
console.log('');
console.log('Now run:');
console.log('npm run build --legacy-peer-deps');
console.log('');
console.log('After successful build, deploy using the Replit UI.');