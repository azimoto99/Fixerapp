/**
 * Test script to debug PaymentElement rendering issues
 * Run this after opening the payment dialog to check console logs
 */

console.log('=== PaymentElement Debug Test ===');

// Test 1: Check if Stripe is loaded
setTimeout(() => {
  console.log('1. Checking Stripe global object...');
  if (window.Stripe) {
    console.log('✓ Stripe global object found');
  } else {
    console.log('✗ Stripe global object not found');
  }
}, 1000);

// Test 2: Check for PaymentElement in DOM
setTimeout(() => {
  console.log('2. Checking for PaymentElement in DOM...');
  const paymentElement = document.querySelector('#payment-element');
  if (paymentElement) {
    console.log('✓ PaymentElement found in DOM:', paymentElement);
    console.log('Element styles:', window.getComputedStyle(paymentElement));
  } else {
    console.log('✗ PaymentElement not found in DOM');
    
    // Check for any Stripe-related elements
    const stripeElements = document.querySelectorAll('[class*="stripe"], [id*="stripe"]');
    console.log('Found Stripe-related elements:', stripeElements);
  }
}, 2000);

// Test 3: Check for iframe (Stripe Elements render in iframes)
setTimeout(() => {
  console.log('3. Checking for Stripe iframes...');
  const iframes = document.querySelectorAll('iframe');
  const stripeIframes = Array.from(iframes).filter(iframe => 
    iframe.src && iframe.src.includes('stripe')
  );
  
  if (stripeIframes.length > 0) {
    console.log('✓ Found Stripe iframes:', stripeIframes);
  } else {
    console.log('✗ No Stripe iframes found');
    console.log('All iframes:', iframes);
  }
}, 3000);

// Test 4: Check console for Stripe errors
setTimeout(() => {
  console.log('4. Check browser console for any Stripe-related errors');
  console.log('Common issues:');
  console.log('- Invalid public key');
  console.log('- Invalid client secret');
  console.log('- CORS issues');
  console.log('- CSS conflicts hiding the element');
  console.log('- JavaScript errors preventing rendering');
}, 4000);

// Test 5: Manual Stripe test
setTimeout(() => {
  console.log('5. Testing manual Stripe initialization...');
  if (window.Stripe && import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    try {
      const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
      console.log('✓ Manual Stripe instance created:', stripe);
    } catch (error) {
      console.log('✗ Error creating manual Stripe instance:', error);
    }
  }
}, 5000);

console.log('Debug test scheduled. Check console logs over the next 5 seconds.'); 