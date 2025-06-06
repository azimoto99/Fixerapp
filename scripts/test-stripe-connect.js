// Test script to check if the Stripe Connect endpoint is working
const fetch = require('node-fetch');

async function testStripeConnectEndpoint() {
  console.log('Testing Stripe Connect endpoint...');
  
  try {
    const response = await fetch('http://localhost:5000/api/stripe/connect/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.AUTH_COOKIE || '' // You'll need to provide a valid auth cookie
      },
      body: JSON.stringify({}),
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const headers = {};
    for (const [key, value] of response.headers.entries()) {
      headers[key] = value;
    }
    console.log('Headers:', headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
    } else {
      console.log('Error response text:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStripeConnectEndpoint();
