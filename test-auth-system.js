#!/usr/bin/env node

/**
 * Authentication System Test Script
 * Tests the core authentication endpoints to verify functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  fullName: 'Test User',
  accountType: 'worker'
};

let sessionCookie = '';

async function makeRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, mergedOptions);
    
    // Extract session cookie from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const sessionMatch = setCookie.match(/connect\.sid=[^;]+/);
      if (sessionMatch) {
        sessionCookie = sessionMatch[0];
      }
    }

    const data = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers
    };
  } catch (error) {
    console.error(`Request failed for ${url}:`, error.message);
    return {
      status: 0,
      ok: false,
      data: { error: error.message },
      headers: new Headers()
    };
  }
}

async function testServerHealth() {
  console.log('🔍 Testing server health...');
  
  const response = await makeRequest('/health');
  
  if (response.ok) {
    console.log('✅ Server is healthy');
    return true;
  } else {
    console.log('❌ Server health check failed:', response.data);
    return false;
  }
}

async function testUserRegistration() {
  console.log('🔍 Testing user registration...');
  
  const response = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });

  if (response.ok) {
    console.log('✅ User registration successful');
    console.log('   User ID:', response.data.user?.id);
    return response.data.user;
  } else {
    console.log('❌ User registration failed:', response.data);
    return null;
  }
}

async function testUserLogin() {
  console.log('🔍 Testing user login...');
  
  const response = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: testUser.username,
      password: testUser.password
    })
  });

  if (response.ok) {
    console.log('✅ User login successful');
    console.log('   Session established:', !!sessionCookie);
    return response.data.user;
  } else {
    console.log('❌ User login failed:', response.data);
    return null;
  }
}

async function testAuthenticatedEndpoint() {
  console.log('🔍 Testing authenticated endpoint...');
  
  const response = await makeRequest('/auth/me');

  if (response.ok) {
    console.log('✅ Authenticated endpoint accessible');
    console.log('   User:', response.data.user?.username);
    return response.data.user;
  } else {
    console.log('❌ Authenticated endpoint failed:', response.data);
    return null;
  }
}

async function testJobPosting() {
  console.log('🔍 Testing job posting...');
  
  const jobData = {
    title: 'Test Job Posting',
    description: 'This is a test job for authentication testing',
    category: 'general',
    paymentType: 'fixed',
    paymentAmount: 50.00,
    location: 'Test Location',
    latitude: 40.7128,
    longitude: -74.0060,
    dateNeeded: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    requiredSkills: ['testing']
  };

  const response = await makeRequest('/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData)
  });

  if (response.ok) {
    console.log('✅ Job posting successful');
    console.log('   Job ID:', response.data.id);
    return response.data;
  } else {
    console.log('❌ Job posting failed:', response.data);
    return null;
  }
}

async function testJobListing() {
  console.log('🔍 Testing job listing...');
  
  const response = await makeRequest('/jobs');

  if (response.ok) {
    console.log('✅ Job listing successful');
    console.log('   Jobs found:', response.data.length || 0);
    return response.data;
  } else {
    console.log('❌ Job listing failed:', response.data);
    return null;
  }
}

async function testUserLogout() {
  console.log('🔍 Testing user logout...');
  
  const response = await makeRequest('/auth/logout', {
    method: 'POST'
  });

  if (response.ok) {
    console.log('✅ User logout successful');
    sessionCookie = ''; // Clear session
    return true;
  } else {
    console.log('❌ User logout failed:', response.data);
    return false;
  }
}

async function runAuthTests() {
  console.log('🚀 Starting Authentication System Tests\n');
  
  const results = {
    serverHealth: false,
    registration: false,
    login: false,
    authenticatedAccess: false,
    jobPosting: false,
    jobListing: false,
    logout: false
  };

  try {
    // Test 1: Server Health
    results.serverHealth = await testServerHealth();
    console.log('');

    if (!results.serverHealth) {
      console.log('❌ Server is not responding. Please start the development server first.');
      console.log('   Run: npm run dev');
      return results;
    }

    // Test 2: User Registration
    const registeredUser = await testUserRegistration();
    results.registration = !!registeredUser;
    console.log('');

    // Test 3: User Login
    const loggedInUser = await testUserLogin();
    results.login = !!loggedInUser;
    console.log('');

    // Test 4: Authenticated Endpoint Access
    const authenticatedUser = await testAuthenticatedEndpoint();
    results.authenticatedAccess = !!authenticatedUser;
    console.log('');

    // Test 5: Job Posting (requires authentication)
    const postedJob = await testJobPosting();
    results.jobPosting = !!postedJob;
    console.log('');

    // Test 6: Job Listing
    const jobList = await testJobListing();
    results.jobListing = !!jobList;
    console.log('');

    // Test 7: User Logout
    results.logout = await testUserLogout();
    console.log('');

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
  }

  // Print Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${testName}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All authentication tests passed! System is ready for development.');
  } else {
    console.log('⚠️  Some tests failed. Please check the server logs and fix issues before proceeding.');
  }

  return results;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthTests().catch(console.error);
}

export { runAuthTests, testUser };
