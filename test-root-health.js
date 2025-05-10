/**
 * Script to test that the root health check is working properly
 * This simulates various types of health check requests
 */

import http from 'http';

// Function to make HTTP request
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Test different health check scenarios
async function runTests() {
  try {
    console.log('Testing root path health checks...');

    // Test 1: Standard health checker User-Agent
    console.log('\nTest 1: Health checker User-Agent');
    const test1 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'ELB-HealthChecker/1.0'
      }
    });
    console.log(`Status: ${test1.statusCode}`);
    console.log(`Body: ${test1.body}`);
    
    // Test 2: Google health checker
    console.log('\nTest 2: Google health checker');
    const test2 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'GoogleHC/1.0'
      }
    });
    console.log(`Status: ${test2.statusCode}`);
    console.log(`Body: ${test2.body}`);
    
    // Test 3: Health check query parameter
    console.log('\nTest 3: Health check query parameter');
    const test3 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/?health=1',
      method: 'GET'
    });
    console.log(`Status: ${test3.statusCode}`);
    console.log(`Body: ${test3.body}`);
    
    // Test 4: Health check header
    console.log('\nTest 4: Health check header');
    const test4 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      headers: {
        'x-health-check': '1'
      }
    });
    console.log(`Status: ${test4.statusCode}`);
    console.log(`Body: ${test4.body}`);
    
    // Test 5: No Accept header (simulates Replit Deployments health check)
    console.log('\nTest 5: No Accept header');
    const test5 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      headers: {
        'Accept': ''
      }
    });
    console.log(`Status: ${test5.statusCode}`);
    console.log(`Body: ${test5.body}`);
    
    // Test 6: Accept any content type
    console.log('\nTest 6: Accept */*');
    const test6 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    console.log(`Status: ${test6.statusCode}`);
    console.log(`Body: ${test6.body}`);
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();