import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Creating temporary package.json for build...');

// Read the current package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Create a temporary package.json with the modified React versions
const tempPackageJson = { ...packageJson };
tempPackageJson.dependencies.react = '^18.2.0';
tempPackageJson.dependencies['react-dom'] = '^18.2.0';

// Write the temporary package.json
const tempPackageJsonPath = path.join(__dirname, 'temp-package.json');
fs.writeFileSync(tempPackageJsonPath, JSON.stringify(tempPackageJson, null, 2));

try {
  // Install dependencies with the temporary package.json
  console.log('Installing dependencies with correct React versions...');
  execSync('npm install --legacy-peer-deps --package-lock-only', {
    env: { ...process.env, npm_config_package_json: 'temp-package.json' },
    stdio: 'inherit'
  });

  // Build the project
  console.log('Building the project...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  // Clean up
  console.log('Cleaning up...');
  fs.unlinkSync(tempPackageJsonPath);
}