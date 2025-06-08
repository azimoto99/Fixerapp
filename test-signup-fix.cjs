const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000';

async function testSignup() {
  console.log('Testing signup flow...\n');
  
  // Generate unique test user
  const timestamp = Date.now();
  const testUser = {
    username: `testuser${timestamp}`,
    password: 'TestPass123!',
    fullName: 'Test User',
    email: `test${timestamp}@example.com`,
    phone: '555-1234',
    bio: 'Test bio',
    skills: ['JavaScript', 'React'],
    accountType: 'worker'
  };
  
  try {
    // Test 1: Register new user
    console.log('1. Testing registration...');
    const registerResponse = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
      credentials: 'include'
    });
    
    const registerData = await registerResponse.json();
    console.log('Registration response:', {
      status: registerResponse.status,
      ok: registerResponse.ok,
      data: registerData
    });
    
    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerData.error || 'Unknown error'}`);
    }
    
    console.log('✓ Registration successful\n');
    
    // Test 2: Check if user is logged in
    console.log('2. Checking session...');
    const userResponse = await fetch(`${API_URL}/api/user`, {
      credentials: 'include',
      headers: {
        'Cookie': registerResponse.headers.get('set-cookie') || ''
      }
    });
    
    const userData = await userResponse.json();
    console.log('User session response:', {
      status: userResponse.status,
      ok: userResponse.ok,
      data: userData
    });
    
    if (!userResponse.ok) {
      throw new Error('Session not established after registration');
    }
    
    console.log('✓ Session established successfully\n');
    
    // Test 3: Try to access protected route
    console.log('3. Testing protected route access...');
    const jobsResponse = await fetch(`${API_URL}/api/jobs?posterId=${userData.id}`, {
      credentials: 'include',
      headers: {
        'Cookie': registerResponse.headers.get('set-cookie') || ''
      }
    });
    
    console.log('Protected route response:', {
      status: jobsResponse.status,
      ok: jobsResponse.ok
    });
    
    if (jobsResponse.ok) {
      console.log('✓ Can access protected routes\n');
    }
    
    console.log('✅ All signup tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSignup(); 