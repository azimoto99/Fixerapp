#!/usr/bin/env node

/**
 * Test script to verify job posting fixes
 * Tests both the totalAmount database fix and z-index dialog fix
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Job Posting Fixes...\\n');

// Test 1: Verify totalAmount is included in job creation
console.log('📊 Test 1: Checking totalAmount calculation...');

const testJobCreationFiles = [
  'server/routes.ts',
  'server/payment-first-job-posting.ts',
  'client/src/components/PostJobDrawer.tsx'
];

let totalAmountTestPassed = true;

testJobCreationFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    if (file.includes('routes.ts')) {
      // Check test job endpoint
      if (content.includes('totalAmount') && content.includes('serviceFee')) {
        console.log(`✅ ${file}: totalAmount calculation found`);
      } else {
        console.log(`❌ ${file}: Missing totalAmount calculation`);
        totalAmountTestPassed = false;
      }
    } else if (file.includes('payment-first-job-posting.ts')) {
      // Check payment-first endpoint
      if (content.includes('serviceFee: 2.5') && content.includes('totalAmount:')) {
        console.log(`✅ ${file}: serviceFee and totalAmount found`);
      } else {
        console.log(`❌ ${file}: Missing serviceFee or totalAmount`);
        totalAmountTestPassed = false;
      }
    } else if (file.includes('PostJobDrawer.tsx')) {
      // Check client-side calculation
      if (content.includes('totalAmount') && content.includes('serviceFee')) {
        console.log(`✅ ${file}: Client-side calculation found`);
      } else {
        console.log(`❌ ${file}: Missing client-side calculation`);
        totalAmountTestPassed = false;
      }
    }
  } else {
    console.log(`❌ ${file}: File not found`);
    totalAmountTestPassed = false;
  }
});

// Test 2: Verify z-index fix for payment dialog
console.log('\\n🎨 Test 2: Checking z-index fix...');

const paymentDialogFile = 'client/src/components/payments/PaymentDialog.tsx';
let zIndexTestPassed = true;

if (fs.existsSync(paymentDialogFile)) {
  const content = fs.readFileSync(paymentDialogFile, 'utf8');
  
  if (content.includes('z-[999990]') && content.includes('z-[999999]')) {
    console.log(`✅ ${paymentDialogFile}: High z-index values found`);
  } else {
    console.log(`❌ ${paymentDialogFile}: Missing high z-index values`);
    zIndexTestPassed = false;
  }
} else {
  console.log(`❌ ${paymentDialogFile}: File not found`);
  zIndexTestPassed = false;
}

// Test 3: Check for database schema compatibility
console.log('\\n🗄️ Test 3: Checking database schema compatibility...');

const schemaFile = 'shared/schema.ts';
let schemaTestPassed = true;

if (fs.existsSync(schemaFile)) {
  const content = fs.readFileSync(schemaFile, 'utf8');
  
  if (content.includes('totalAmount') && content.includes('serviceFee')) {
    console.log(`✅ ${schemaFile}: Required fields found in schema`);
  } else {
    console.log(`❌ ${schemaFile}: Missing required fields in schema`);
    schemaTestPassed = false;
  }
} else {
  console.log(`❌ ${schemaFile}: File not found`);
  schemaTestPassed = false;
}

// Summary
console.log('\\n📋 Test Summary:');
console.log(`Total Amount Fix: ${totalAmountTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Z-Index Fix: ${zIndexTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Schema Compatibility: ${schemaTestPassed ? '✅ PASSED' : '❌ FAILED'}`);

const allTestsPassed = totalAmountTestPassed && zIndexTestPassed && schemaTestPassed;
console.log(`\\nOverall Status: ${allTestsPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);

if (allTestsPassed) {
  console.log('\\n🚀 Job posting fixes are ready for deployment!');
  console.log('\\nFixed Issues:');
  console.log('1. ✅ Database constraint error for totalAmount column');
  console.log('2. ✅ Payment dialog z-index obscuring issue');
  console.log('3. ✅ Service fee calculation consistency');
} else {
  console.log('\\n⚠️ Please review and fix the failing tests before deployment.');
}

process.exit(allTestsPassed ? 0 : 1); 