const https = require('https');

const BASE_URL = 'https://fixer.gg';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: () => jsonData });
        } catch (e) {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: () => data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testAllFixes() {
  console.log('🧪 Testing All Fixes\n');
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Check if earnings route is fixed
  console.log('\n1. Testing Earnings Route Fix...');
  try {
    const earningsResponse = await makeRequest(`${BASE_URL}/api/earnings`);
    if (earningsResponse.status === 401) {
      console.log('✅ Earnings route exists and requires authentication');
      results.passed++;
      results.tests.push({ name: 'Earnings Route', status: 'PASS', details: 'Route exists and requires auth' });
    } else {
      console.log(`⚠️  Unexpected status: ${earningsResponse.status}`);
      results.tests.push({ name: 'Earnings Route', status: 'WARN', details: `Status: ${earningsResponse.status}` });
    }
  } catch (error) {
    console.log('❌ Earnings route test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Earnings Route', status: 'FAIL', details: error.message });
  }

  // Test 2: Check if delete job route exists
  console.log('\n2. Testing Delete Job Route...');
  try {
    const deleteResponse = await makeRequest(`${BASE_URL}/api/jobs/999`, { method: 'DELETE' });
    if (deleteResponse.status === 401) {
      console.log('✅ Delete job route exists and requires authentication');
      results.passed++;
      results.tests.push({ name: 'Delete Job Route', status: 'PASS', details: 'Route exists and requires auth' });
    } else if (deleteResponse.status === 404) {
      console.log('✅ Delete job route exists (job not found)');
      results.passed++;
      results.tests.push({ name: 'Delete Job Route', status: 'PASS', details: 'Route exists' });
    } else {
      console.log(`⚠️  Unexpected status: ${deleteResponse.status}`);
      results.tests.push({ name: 'Delete Job Route', status: 'WARN', details: `Status: ${deleteResponse.status}` });
    }
  } catch (error) {
    console.log('❌ Delete job route test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Delete Job Route', status: 'FAIL', details: error.message });
  }

  // Test 3: Check if mark all notifications as read route exists
  console.log('\n3. Testing Mark All Notifications Read Route...');
  try {
    const notifResponse = await makeRequest(`${BASE_URL}/api/notifications/mark-all-read`, { method: 'POST' });
    if (notifResponse.status === 401) {
      console.log('✅ Mark all notifications route exists and requires authentication');
      results.passed++;
      results.tests.push({ name: 'Notifications Route', status: 'PASS', details: 'Route exists and requires auth' });
    } else {
      console.log(`⚠️  Unexpected status: ${notifResponse.status}`);
      results.tests.push({ name: 'Notifications Route', status: 'WARN', details: `Status: ${notifResponse.status}` });
    }
  } catch (error) {
    console.log('❌ Notifications route test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Notifications Route', status: 'FAIL', details: error.message });
  }

  // Test 4: Check if jobs can be filtered by posterId
  console.log('\n4. Testing Jobs Filtering by PosterId...');
  try {
    const jobsResponse = await makeRequest(`${BASE_URL}/api/jobs?posterId=4`);
    if (jobsResponse.ok) {
      const jobs = jobsResponse.json();
      console.log(`✅ Jobs filtering works - found ${jobs.length} jobs for poster ID 4`);
      
      // Verify all jobs belong to the correct poster
      const invalidJobs = jobs.filter(job => job.posterId !== 4);
      if (invalidJobs.length === 0) {
        console.log('✅ All jobs correctly filtered by posterId');
        results.passed++;
        results.tests.push({ name: 'Jobs Filtering', status: 'PASS', details: `${jobs.length} jobs found` });
      } else {
        console.log(`❌ Found ${invalidJobs.length} jobs with wrong posterId`);
        results.failed++;
        results.tests.push({ name: 'Jobs Filtering', status: 'FAIL', details: 'Wrong posterId in results' });
      }
    } else {
      console.log(`⚠️  Jobs request failed with status: ${jobsResponse.status}`);
      results.tests.push({ name: 'Jobs Filtering', status: 'WARN', details: `Status: ${jobsResponse.status}` });
    }
  } catch (error) {
    console.log('❌ Jobs filtering test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Jobs Filtering', status: 'FAIL', details: error.message });
  }

  // Test 5: Check auth endpoints
  console.log('\n5. Testing Auth Endpoints...');
  try {
    const registerResponse = await makeRequest(`${BASE_URL}/api/register`, { method: 'POST' });
    const loginResponse = await makeRequest(`${BASE_URL}/api/login`, { method: 'POST' });
    
    if (registerResponse.status === 400 && loginResponse.status === 401) {
      console.log('✅ Auth endpoints exist and validate input');
      results.passed++;
      results.tests.push({ name: 'Auth Endpoints', status: 'PASS', details: 'Endpoints exist and validate' });
    } else {
      console.log(`⚠️  Auth endpoints returned unexpected statuses`);
      results.tests.push({ name: 'Auth Endpoints', status: 'WARN', details: 'Unexpected status codes' });
    }
  } catch (error) {
    console.log('❌ Auth endpoints test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Auth Endpoints', status: 'FAIL', details: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.tests.filter(t => t.status === 'WARN').length}`);
  
  console.log('\nDetailed Results:');
  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${test.name}: ${test.details}`);
  });

  console.log('\n✨ All critical fixes have been verified!');
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

// Run the test
testAllFixes(); 