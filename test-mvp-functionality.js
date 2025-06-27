#!/usr/bin/env node

/**
 * Comprehensive MVP Functionality Test Suite
 * Tests all core features required for MVP launch
 */

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  delay: 1000
};

// Test data
const testUsers = {
  worker: {
    username: `worker_${Date.now()}`,
    email: `worker_${Date.now()}@example.com`,
    password: 'WorkerPass123!',
    fullName: 'Test Worker',
    accountType: 'worker'
  },
  poster: {
    username: `poster_${Date.now()}`,
    email: `poster_${Date.now()}@example.com`,
    password: 'PosterPass123!',
    fullName: 'Test Poster',
    accountType: 'poster'
  }
};

let sessions = {
  worker: '',
  poster: ''
};

let testJob = null;
let testApplication = null;

// Utility functions
async function makeRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
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
    
    // Extract session cookie
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const sessionMatch = setCookie.match(/connect\.sid=[^;]+/);
      if (sessionMatch) {
        return {
          status: response.status,
          ok: response.ok,
          data: await response.json().catch(() => ({})),
          sessionCookie: sessionMatch[0]
        };
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      data: await response.json().catch(() => ({})),
      sessionCookie: null
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: { error: error.message },
      sessionCookie: null
    };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function testServerHealth() {
  console.log('🔍 Testing server health...');
  
  // Try multiple endpoints to verify server is responding
  const endpoints = ['/jobs', '/auth/status', '/'];
  
  for (const endpoint of endpoints) {
    const response = await makeRequest(endpoint);
    if (response.status !== 0) {
      console.log('✅ Server is responding');
      return true;
    }
    await sleep(1000);
  }
  
  console.log('❌ Server is not responding');
  return false;
}

async function testUserRegistration() {
  console.log('🔍 Testing user registration...');
  
  const results = {};
  
  for (const [type, userData] of Object.entries(testUsers)) {
    const response = await makeRequest('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      console.log(`✅ ${type} registration successful`);
      results[type] = { success: true, user: response.data };
    } else {
      console.log(`❌ ${type} registration failed:`, response.data);
      results[type] = { success: false, error: response.data };
    }
  }
  
  return results;
}

async function testUserLogin() {
  console.log('🔍 Testing user login...');
  
  const results = {};
  
  for (const [type, userData] of Object.entries(testUsers)) {
    const response = await makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({
        username: userData.username,
        password: userData.password
      })
    });

    if (response.ok && response.sessionCookie) {
      console.log(`✅ ${type} login successful`);
      sessions[type] = response.sessionCookie;
      results[type] = { success: true, user: response.data };
    } else {
      console.log(`❌ ${type} login failed:`, response.data);
      results[type] = { success: false, error: response.data };
    }
  }
  
  return results;
}

async function testJobPosting() {
  console.log('🔍 Testing job posting...');
  
  const jobData = {
    title: 'MVP Test Job',
    description: 'This is a comprehensive test job for MVP validation',
    category: 'general',
    paymentType: 'fixed',
    paymentAmount: 75.00,
    location: 'Test City, TS',
    latitude: 40.7128,
    longitude: -74.0060,
    dateNeeded: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    requiredSkills: ['testing', 'validation']
  };

  const response = await makeRequest('/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessions.poster
    },
    body: JSON.stringify(jobData)
  });

  if (response.ok) {
    console.log('✅ Job posting successful');
    testJob = response.data.job || response.data;
    return { success: true, job: testJob };
  } else {
    console.log('❌ Job posting failed:', response.data);
    return { success: false, error: response.data };
  }
}

async function testJobListing() {
  console.log('🔍 Testing job listing...');
  
  const response = await makeRequest('/jobs');

  if (response.ok) {
    const jobs = response.data.results || response.data;
    console.log(`✅ Job listing successful - Found ${jobs.length} jobs`);
    return { success: true, jobs };
  } else {
    console.log('❌ Job listing failed:', response.data);
    return { success: false, error: response.data };
  }
}

async function testJobApplication() {
  console.log('🔍 Testing job application...');
  
  if (!testJob) {
    console.log('❌ No test job available for application');
    return { success: false, error: 'No test job available' };
  }

  const applicationData = {
    jobId: testJob.id,
    message: 'I would like to apply for this MVP test job',
    hourlyRate: 30.00,
    expectedDuration: '3 hours'
  };

  const response = await makeRequest('/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessions.worker
    },
    body: JSON.stringify(applicationData)
  });

  if (response.ok) {
    console.log('✅ Job application successful');
    testApplication = response.data;
    return { success: true, application: testApplication };
  } else {
    console.log('❌ Job application failed:', response.data);
    return { success: false, error: response.data };
  }
}

async function testPaymentSystem() {
  console.log('🔍 Testing payment system...');
  
  if (!testJob) {
    console.log('❌ No test job available for payment testing');
    return { success: false, error: 'No test job available' };
  }

  // Test payment intent creation
  const paymentData = {
    amount: Math.round(testJob.paymentAmount * 100), // Convert to cents
    currency: 'usd',
    jobId: testJob.id
  };

  const response = await makeRequest('/stripe/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessions.poster
    },
    body: JSON.stringify(paymentData)
  });

  if (response.ok) {
    console.log('✅ Payment intent creation successful');
    return { success: true, paymentIntent: response.data };
  } else {
    console.log('❌ Payment intent creation failed:', response.data);
    return { success: false, error: response.data };
  }
}

async function testUserProfiles() {
  console.log('🔍 Testing user profiles...');
  
  const results = {};
  
  for (const [type, session] of Object.entries(sessions)) {
    if (!session) continue;
    
    const response = await makeRequest('/user/profile', {
      headers: {
        'Cookie': session
      }
    });

    if (response.ok) {
      console.log(`✅ ${type} profile access successful`);
      results[type] = { success: true, profile: response.data };
    } else {
      console.log(`❌ ${type} profile access failed:`, response.data);
      results[type] = { success: false, error: response.data };
    }
  }
  
  return results;
}

async function testFrontendAccess() {
  console.log('🔍 Testing frontend access...');
  
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    
    if (response.ok && html.includes('Fixer')) {
      console.log('✅ Frontend is accessible');
      return { success: true };
    } else {
      console.log('❌ Frontend access failed');
      return { success: false, error: 'Frontend not loading properly' };
    }
  } catch (error) {
    console.log('❌ Frontend access failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runMVPTests() {
  console.log('🚀 Starting Comprehensive MVP Test Suite\n');
  console.log('=' .repeat(50));
  
  const results = {
    serverHealth: false,
    userRegistration: false,
    userLogin: false,
    jobPosting: false,
    jobListing: false,
    jobApplication: false,
    paymentSystem: false,
    userProfiles: false,
    frontendAccess: false
  };

  const testDetails = {};

  try {
    // Test 1: Server Health
    results.serverHealth = await testServerHealth();
    console.log('');

    if (!results.serverHealth) {
      console.log('❌ Server is not responding. Please start the development server first.');
      console.log('   Run: npm run dev');
      return { results, details: testDetails };
    }

    // Test 2: User Registration
    const registrationResults = await testUserRegistration();
    results.userRegistration = Object.values(registrationResults).every(r => r.success);
    testDetails.userRegistration = registrationResults;
    console.log('');

    // Test 3: User Login
    const loginResults = await testUserLogin();
    results.userLogin = Object.values(loginResults).every(r => r.success);
    testDetails.userLogin = loginResults;
    console.log('');

    // Test 4: Job Posting
    const jobPostingResult = await testJobPosting();
    results.jobPosting = jobPostingResult.success;
    testDetails.jobPosting = jobPostingResult;
    console.log('');

    // Test 5: Job Listing
    const jobListingResult = await testJobListing();
    results.jobListing = jobListingResult.success;
    testDetails.jobListing = jobListingResult;
    console.log('');

    // Test 6: Job Application
    const jobApplicationResult = await testJobApplication();
    results.jobApplication = jobApplicationResult.success;
    testDetails.jobApplication = jobApplicationResult;
    console.log('');

    // Test 7: Payment System
    const paymentResult = await testPaymentSystem();
    results.paymentSystem = paymentResult.success;
    testDetails.paymentSystem = paymentResult;
    console.log('');

    // Test 8: User Profiles
    const profileResults = await testUserProfiles();
    results.userProfiles = Object.values(profileResults).some(r => r.success);
    testDetails.userProfiles = profileResults;
    console.log('');

    // Test 9: Frontend Access
    const frontendResult = await testFrontendAccess();
    results.frontendAccess = frontendResult.success;
    testDetails.frontendAccess = frontendResult;
    console.log('');

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
  }

  // Print Summary
  console.log('📊 MVP Test Results Summary:');
  console.log('=' .repeat(50));
  
  const testNames = {
    serverHealth: 'Server Health',
    userRegistration: 'User Registration',
    userLogin: 'User Login',
    jobPosting: 'Job Posting',
    jobListing: 'Job Listing',
    jobApplication: 'Job Application',
    paymentSystem: 'Payment System',
    userProfiles: 'User Profiles',
    frontendAccess: 'Frontend Access'
  };

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testNames[test]}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  // MVP Readiness Assessment
  const criticalTests = ['serverHealth', 'userRegistration', 'userLogin', 'jobPosting', 'jobListing'];
  const criticalPassed = criticalTests.filter(test => results[test]).length;
  const mvpReadiness = (criticalPassed / criticalTests.length) * 100;
  
  console.log(`\n📈 MVP Readiness: ${mvpReadiness.toFixed(1)}%`);
  
  if (mvpReadiness >= 80) {
    console.log('🎉 MVP is ready for beta testing!');
  } else if (mvpReadiness >= 60) {
    console.log('⚠️  MVP needs some fixes before launch');
  } else {
    console.log('🚨 MVP requires significant work before launch');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (!results.paymentSystem) {
    console.log('- Fix payment system integration');
  }
  if (!results.jobApplication) {
    console.log('- Implement job application functionality');
  }
  if (!results.userProfiles) {
    console.log('- Fix user profile endpoints');
  }
  if (!results.frontendAccess) {
    console.log('- Ensure frontend is properly served');
  }

  return { results, details: testDetails, mvpReadiness };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runMVPTests, testUsers, sessions };
}

// Run tests if this script is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runMVPTests().catch(console.error);
}
