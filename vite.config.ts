import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import type { PluginOption } from 'vite';

export default defineConfig(async ({ mode }) => {
  // Load env file based on `mode` in the current directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('Vite environment variables loaded:');
  console.log(`NODE_ENV: ${env.NODE_ENV}`);
  console.log(`VITE_STRIPE_PUBLIC_KEY: ${env.VITE_STRIPE_PUBLIC_KEY ? 'Set' : 'Not set'}`);
  console.log(`VITE_MAPBOX_ACCESS_TOKEN: ${env.VITE_MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set'}`);

  // Only load development plugins in non-production environment
  const plugins: PluginOption[] = [react()];
  
  if (mode !== "production") {
    // Dynamically import development-only plugins
    const runtimeErrorOverlay = (await import("@replit/vite-plugin-runtime-error-modal")).default;
    const cartographer = (await import("@replit/vite-plugin-cartographer")).cartographer;
    
    plugins.push(runtimeErrorOverlay() as PluginOption);
    plugins.push(cartographer() as PluginOption);
  }

  const root = path.resolve(process.cwd(), "client");
  const srcPath = path.resolve(root, "src");

  return {
    plugins,
    resolve: {
      alias: {
        '@': srcPath,
        '@shared': path.resolve(process.cwd(), 'shared'),
        '@assets': path.resolve(process.cwd(), 'attached_assets'),
      },
    },
    root,
    build: {
      outDir: path.resolve(process.cwd(), "dist/public"),
      emptyOutDir: true,
    },
    // Define environment variables that should be exposed to the client
    define: {
      'process.env': {
        VITE_STRIPE_PUBLIC_KEY: JSON.stringify(env.VITE_STRIPE_PUBLIC_KEY),
        VITE_MAPBOX_ACCESS_TOKEN: JSON.stringify(env.VITE_MAPBOX_ACCESS_TOKEN),
      }
    },
    // Server configuration
    server: {
      port: 5000,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5000,
        clientPort: 5000
      }
    }
  };
});
