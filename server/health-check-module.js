/**
 * Simple standalone health check module
 * Can be used independently of the main app to verify health
 */

import http from 'http';

// Default port to check
const DEFAULT_PORT = 5000;
// Default host to check
const DEFAULT_HOST = 'localhost';
// Default path to check
const DEFAULT_PATH = '/';
// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 5000;

/**
 * Check the health of the application
 * @param {Object} options - Health check options
 * @param {string} [options.host=localhost] - Host to check
 * @param {number} [options.port=5000] - Port to check
 * @param {string} [options.path=/] - Path to check
 * @param {number} [options.timeout=5000] - Timeout in milliseconds
 * @returns {Promise<Object>} - Result of health check with success flag and response details
 */
export async function checkHealth(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = options.port || DEFAULT_PORT;
  const path = options.path || DEFAULT_PATH;
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: timeout,
      headers: {
        // Set header that triggers dedicated health check handling
        'x-health-check': '1',
        // This simulates how Replit deployments health check works
        'Accept': '*/*'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timed out'
      });
    });
    
    req.end();
  });
}

// Allow running as a standalone script
if (process.argv[1].endsWith('health-check-module.js')) {
  (async () => {
    // Extract port from command line if provided
    const port = parseInt(process.argv[2]) || DEFAULT_PORT;
    
    console.log(`Checking health at ${DEFAULT_HOST}:${port}${DEFAULT_PATH}...`);
    const result = await checkHealth({ port });
    
    if (result.success) {
      console.log(`✅ Health check passed: ${result.statusCode}`);
      if (result.body) {
        console.log(`Response: ${result.body}`);
      }
      process.exit(0);
    } else {
      console.error(`❌ Health check failed: ${result.error || `Status ${result.statusCode}`}`);
      process.exit(1);
    }
  })();
}