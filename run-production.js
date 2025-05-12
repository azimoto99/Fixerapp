/**
 * Production server launcher for Fixer app
 * This file is used to start the server in production mode after build
 */

// Use native node modules
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Check if the build exists
if (!fs.existsSync(path.join(__dirname, 'dist', 'index.js'))) {
  console.error('Error: Build files not found! Run ./build-for-deploy.sh first.');
  process.exit(1);
}

// Check for required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'VITE_STRIPE_PUBLIC_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('Please set these variables before starting the production server.');
  process.exit(1);
}

console.log('Starting Fixer app in production mode...');
console.log('Using node version:', process.version);
console.log('Database connection available:', !!process.env.DATABASE_URL);
console.log('Stripe keys configured:', !!process.env.STRIPE_SECRET_KEY && !!process.env.VITE_STRIPE_PUBLIC_KEY);

// Run the server
const server = exec('node dist/index.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Execution error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Server error: ${stderr}`);
    return;
  }
  console.log(`Server output: ${stdout}`);
});

// Forward logs to console
server.stdout.on('data', (data) => {
  console.log(data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.error(data.toString().trim());
});

// Handle process shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.kill();
  process.exit();
});