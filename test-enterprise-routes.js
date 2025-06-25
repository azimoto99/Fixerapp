#!/usr/bin/env node

/**
 * Enterprise Routes Testing Script
 * Tests all enterprise API endpoints to ensure they're properly connected
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5000';

// Test data
const testRoutes = [
  // Business endpoints
  { method: 'GET', path: '/api/enterprise/business', needsAuth: true },
  { method: 'POST', path: '/api/enterprise/business', needsAuth: true },
  { method: 'PUT', path: '/api/enterprise/business', needsAuth: true },
  { method: 'GET', path: '/api/enterprise/stats', needsAuth: true },
  
  // Hub pins endpoints
  { method: 'GET', path: '/api/enterprise/hub-pins', needsAuth: true },
  { method: 'GET', path: '/api/enterprise/hub-pins/active', needsAuth: false },
  { method: 'POST', path: '/api/enterprise/hub-pins', needsAuth: true },
  { method: 'GET', path: '/api/enterprise/hub-pins/1', needsAuth: false },
  
  // Positions endpoints
  { method: 'GET', path: '/api/enterprise/positions', needsAuth: true },
  { method: 'POST', path: '/api/enterprise/positions', needsAuth: true },
  
  // Applications endpoints
  { method: 'GET', path: '/api/enterprise/applications', needsAuth: true },
  
  // Messaging endpoints
  { method: 'GET', path: '/api/contacts', needsAuth: true },
  { method: 'POST', path: '/api/contacts/add', needsAuth: true },
  { method: 'GET', path: '/api/messages', needsAuth: true },
  { method: 'POST', path: '/api/messages/send', needsAuth: true },
  { method: 'GET', path: '/api/contact-requests', needsAuth: true },
  { method: 'POST', path: '/api/contact-requests/send', needsAuth: true },
];

function makeRequest(method, path, expectedStatus = null) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Enterprise-Route-Tester/1.0'
      }
    };

    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = {
          method,
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data,
          success: expectedStatus ? res.statusCode === expectedStatus : res.statusCode < 500
        };
        resolve(result);
      });
    });

    req.on('error', (error) => {
      reject({ method, path, error: error.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject({ method, path, error: 'Request timeout' });
    });

    req.end();
  });
}

async function testRoutes() {
  console.log('🚀 Testing Enterprise Routes...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  for (const route of testRoutes) {
    try {
      console.log(`Testing ${route.method} ${route.path}...`);
      
      // For authenticated routes, we expect 401
      // For public routes, we expect 200 or other success codes
      const expectedStatus = route.needsAuth ? 401 : null;
      
      const result = await makeRequest(route.method, route.path, expectedStatus);
      
      if (route.needsAuth && result.status === 401) {
        console.log(`✅ ${route.method} ${route.path} - Correctly requires authentication (401)`);
        results.passed++;
      } else if (!route.needsAuth && result.status < 500) {
        console.log(`✅ ${route.method} ${route.path} - Route exists (${result.status})`);
        results.passed++;
      } else if (result.status === 404) {
        console.log(`❌ ${route.method} ${route.path} - Route not found (404)`);
        results.failed++;
        results.errors.push(`${route.method} ${route.path} - Route not implemented`);
      } else if (result.status >= 500) {
        console.log(`⚠️  ${route.method} ${route.path} - Server error (${result.status})`);
        results.failed++;
        results.errors.push(`${route.method} ${route.path} - Server error: ${result.status}`);
      } else {
        console.log(`✅ ${route.method} ${route.path} - Route accessible (${result.status})`);
        results.passed++;
      }
      
    } catch (error) {
      console.log(`❌ ${route.method} ${route.path} - Connection failed: ${error.error || error.message}`);
      results.failed++;
      results.errors.push(`${route.method} ${route.path} - ${error.error || error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\n🔍 Issues Found:');
    results.errors.forEach(error => console.log(`   • ${error}`));
  }

  if (results.failed === 0) {
    console.log('\n🎉 All enterprise routes are properly connected!');
  } else {
    console.log('\n⚠️  Some routes need attention. Check the issues above.');
  }

  return results;
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRoutes().catch(console.error);
}

module.exports = { testRoutes };
