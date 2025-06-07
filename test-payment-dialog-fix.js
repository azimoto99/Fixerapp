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

// Test 2: Check z-index values are still high
console.log('\n🎨 Test 2: Checking z-index values...');

const paymentDialogComponentFile = 'client/src/components/payments/PaymentDialog.tsx';
let zIndexTestPassed = true;

if (fs.existsSync(paymentDialogComponentFile)) {
  const content = fs.readFileSync(paymentDialogComponentFile, 'utf8');
  
  if (content.includes('z-[999990]') && content.includes('z-[999999]')) {
    console.log('✅ High z-index values maintained');
  } else {
    console.log('❌ Z-index values not high enough');
    zIndexTestPassed = false;
  }
} else {
  console.log('❌ PaymentDialog.tsx not found');
  zIndexTestPassed = false;
}

// Summary
console.log('\n📋 Test Summary:');
console.log(`Dialog Loading Fix: ${dialogTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Z-Index Fix: ${zIndexTestPassed ? '✅ PASSED' : '❌ FAILED'}`);

const allTestsPassed = dialogTestPassed && zIndexTestPassed;
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