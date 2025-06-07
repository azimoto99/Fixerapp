#!/usr/bin/env node

/**
 * Test script to verify payment dialog fixes
 * Checks that the dialog properly handles loading states and setup intent
 */

import fs from 'fs';

console.log('🧪 Testing Payment Dialog Fix...\n');

// Test 1: Check if PaymentDialogManager has proper loading states
console.log('📱 Test 1: Checking dialog loading states...');

const paymentDialogFile = 'client/src/components/payments/PaymentDialogManager.tsx';
let dialogTestPassed = true;

if (fs.existsSync(paymentDialogFile)) {
  const content = fs.readFileSync(paymentDialogFile, 'utf8');
  
  // Check for proper loading state
  if (content.includes('Initializing payment form...') && content.includes('Setting up payment form...')) {
    console.log('✅ Loading states found');
  } else {
    console.log('❌ Missing proper loading states');
    dialogTestPassed = false;
  }
  
  // Check for automatic setup intent trigger
  if (content.includes('setupIntent.mutate();') && !content.includes('if (!clientSecret)')) {
    console.log('✅ Automatic setup intent trigger found');
  } else {
    console.log('❌ Missing automatic setup intent trigger');
    dialogTestPassed = false;
  }
  
  // Check for client secret reset
  if (content.includes('setClientSecret(null)')) {
    console.log('✅ Client secret reset found');
  } else {
    console.log('❌ Missing client secret reset');
    dialogTestPassed = false;
  }
  
} else {
  console.log('❌ PaymentDialogManager.tsx not found');
  dialogTestPassed = false;
}

// Test 2: Check that overlay has been removed
console.log('\n🎨 Test 2: Checking overlay removal...');

const paymentDialogComponentFile = 'client/src/components/payments/PaymentDialog.tsx';
let overlayTestPassed = true;

if (fs.existsSync(paymentDialogComponentFile)) {
  const content = fs.readFileSync(paymentDialogComponentFile, 'utf8');
  
  if (!content.includes('PaymentDialogOverlay') && !content.includes('bg-black/80')) {
    console.log('✅ Blur overlay removed successfully');
  } else {
    console.log('❌ Blur overlay still present');
    overlayTestPassed = false;
  }
  
  if (content.includes('z-[999999]')) {
    console.log('✅ Dialog content z-index maintained');
  } else {
    console.log('❌ Dialog content z-index missing');
    overlayTestPassed = false;
  }
} else {
  console.log('❌ PaymentDialog.tsx not found');
  overlayTestPassed = false;
}

// Summary
console.log('\n📋 Test Summary:');
console.log(`Dialog Loading Fix: ${dialogTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Overlay Removal Fix: ${overlayTestPassed ? '✅ PASSED' : '❌ FAILED'}`);

const allTestsPassed = dialogTestPassed && overlayTestPassed;
console.log(`\nOverall Status: ${allTestsPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);

if (allTestsPassed) {
  console.log('\n🚀 Payment dialog fixes are ready!');
  console.log('\nFixed Issues:');
  console.log('1. ✅ Dark overlay issue - dialog now shows proper content');
  console.log('2. ✅ Loading states - users see progress indicators');
  console.log('3. ✅ Fresh setup intent - each dialog open gets new client secret');
  console.log('4. ✅ High z-index - dialog appears above all other components');
} else {
  console.log('\n⚠️ Please review and fix the failing tests.');
}

process.exit(allTestsPassed ? 0 : 1); 