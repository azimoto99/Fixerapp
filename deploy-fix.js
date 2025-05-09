import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🛠️ Starting deployment fix...');

// 1. Backup the package.json file
console.log('📦 Backing up package.json...');
const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageJsonBackupPath = path.resolve(__dirname, 'package.json.bak');
fs.copyFileSync(packageJsonPath, packageJsonBackupPath);

// 2. Read the current package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 3. Remove problematic dependencies
console.log('🧹 Removing problematic dependencies...');
const problematicDeps = [
  '@capacitor/android',
  '@capacitor/cli',
  '@capacitor/core',
  '@expo/webpack-config',
  'expo',
  'expo-cli',
  'expo-dev-client',
  'expo-updates'
];

for (const dep of problematicDeps) {
  if (packageJson.dependencies[dep]) {
    delete packageJson.dependencies[dep];
    console.log(`   Removed ${dep}`);
  }
}

// 4. Set React and React-DOM to compatible versions
console.log('🔄 Setting React to compatible version...');
packageJson.dependencies['react'] = '^18.2.0';
packageJson.dependencies['react-dom'] = '^18.2.0';

// 5. Write modified package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ Updated package.json');

// 6. Modify Vite Config
console.log('⚙️ Modifying vite.config.ts...');
const viteConfigPath = path.resolve(__dirname, 'vite.config.ts');
const viteConfigBackupPath = path.resolve(__dirname, 'vite.config.ts.bak');
fs.copyFileSync(viteConfigPath, viteConfigBackupPath);

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

fs.writeFileSync(viteConfigPath, newViteConfig, 'utf8');
console.log('✅ Updated vite.config.ts');

// 7. Create a .npmrc file to allow legacy peer deps
console.log('📄 Creating .npmrc file for legacy peer dependencies...');
const npmrcPath = path.resolve(__dirname, '.npmrc');
fs.writeFileSync(npmrcPath, 'legacy-peer-deps=true\n', 'utf8');
console.log('✅ Created .npmrc file');

// 8. Create deployment hooks file
console.log('🪝 Creating deployment hooks file...');
const deployHooksPath = path.resolve(__dirname, '.deployment');
const deployHooksContent = `[hooks]
prebuild="npm install --production=false --legacy-peer-deps"
`;
fs.writeFileSync(deployHooksPath, deployHooksContent, 'utf8');
console.log('✅ Created .deployment hooks file');

// 9. Create a production start script
console.log('🚀 Creating production start script...');
const startScriptPath = path.resolve(__dirname, 'start.sh');
const startScriptContent = `#!/bin/bash
NODE_ENV=production node dist/index.js
`;
fs.writeFileSync(startScriptPath, startScriptContent, 'utf8');
fs.chmodSync(startScriptPath, '755');
console.log('✅ Created production start script');

// 10. Final instructions
console.log('\n🎉 Deployment fix complete!');
console.log('\nTo build and deploy:');
console.log('1. Run: npm install --legacy-peer-deps');
console.log('2. Run: npm run build');
console.log('3. Use the Deploy button in the Replit UI');
console.log('\nTo restore original files:');
console.log('1. Run: mv package.json.bak package.json');
console.log('2. Run: mv vite.config.ts.bak vite.config.ts');
console.log('3. Run: rm .npmrc .deployment start.sh');