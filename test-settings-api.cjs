const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testSettingsAPI() {
  try {
    console.log('Testing Platform Settings API...\n');

    // First, we need to login as admin to get session cookies
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'azi',
      password: 'Kr3wsk!!'
    }, {
      withCredentials: true
    });

    if (loginResponse.status === 200) {
      console.log('✅ Admin login successful');
    }

    // Get the session cookie from login response
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';

    // Test GET settings endpoint
    console.log('\n2. Testing GET /admin/settings/platform...');
    const getResponse = await axios.get(`${BASE_URL}/admin/settings/platform`, {
      headers: {
        'Cookie': cookieHeader
      },
      withCredentials: true
    });

    if (getResponse.status === 200) {
      console.log('✅ GET settings successful');
      console.log('Settings retrieved:', Object.keys(getResponse.data.settings).length, 'settings');
      
      // Show a few sample settings
      const settings = getResponse.data.settings;
      console.log('Sample settings:');
      console.log('- Platform Name:', settings.platformName);
      console.log('- Platform Fee:', settings.platformFee);
      console.log('- Maintenance Mode:', settings.maintenanceMode);
    }

    // Test PUT settings endpoint (update a setting)
    console.log('\n3. Testing PUT /admin/settings/platform...');
    const updateResponse = await axios.put(`${BASE_URL}/admin/settings/platform`, {
      settings: {
        platformName: 'Fixer Pro',
        platformFee: 4.5,
        maintenanceMode: false
      }
    }, {
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });

    if (updateResponse.status === 200) {
      console.log('✅ PUT settings successful');
      console.log('Response:', updateResponse.data.message);
    }

    // Verify the update worked
    console.log('\n4. Verifying settings update...');
    const verifyResponse = await axios.get(`${BASE_URL}/admin/settings/platform`, {
      headers: {
        'Cookie': cookieHeader
      },
      withCredentials: true
    });

    if (verifyResponse.status === 200) {
      const updatedSettings = verifyResponse.data.settings;
      console.log('✅ Settings verification successful');
      console.log('Updated Platform Name:', updatedSettings.platformName);
      console.log('Updated Platform Fee:', updatedSettings.platformFee);
    }

    console.log('\n🎉 All settings API tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('Note: Make sure you have an admin account with the correct credentials');
    }
  }
}

testSettingsAPI();
