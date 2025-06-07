// Simple test script to verify API endpoints return JSON instead of HTML
const fetch = require('node-fetch');

async function testApiEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  // Test endpoints that should return JSON
  const endpoints = [
    '/api/jobs',
    '/api/users',
    '/api/applications'
  ];
  
  console.log('Testing API endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(`${baseUrl}${endpoint}`);
      const contentType = response.headers.get('content-type');
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        console.log(`  ✅ Returns JSON`);
      } else if (contentType && contentType.includes('text/html')) {
        console.log(`  ❌ Returns HTML (doctype error)`);
      } else {
        console.log(`  ⚠️  Unknown content type`);
      }
      
      // Try to parse as JSON
      try {
        const data = await response.json();
        console.log(`  ✅ Valid JSON response`);
      } catch (e) {
        console.log(`  ❌ Invalid JSON response`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Run the test
testApiEndpoints().catch(console.error); 