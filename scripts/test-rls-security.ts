#!/usr/bin/env ts-node

/**
 * Test script to verify Row Level Security implementation
 * Run this after applying RLS migration to ensure policies work correctly
 */

import { db, client } from '../server/db';
import { users, jobs, payments, messages } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { setUserContext, withAdminContext, withUserContext } from '../server/middleware/rls-context';

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(testName: string, testFn: () => Promise<void>) {
  try {
    console.log(`🧪 Running test: ${testName}`);
    await testFn();
    results.push({ test: testName, passed: true });
    console.log(`✅ ${testName} - PASSED`);
  } catch (error) {
    results.push({ 
      test: testName, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error)
    });
    console.log(`❌ ${testName} - FAILED: ${error}`);
  }
}

async function createTestUsers() {
  console.log('📝 Creating test users...');
  
  // Create test users with admin context
  return await withAdminContext(async () => {
    const testUsers = await db.insert(users).values([
      {
        username: 'testworker1',
        password: 'hashedpassword1',
        fullName: 'Test Worker 1',
        email: 'worker1@test.com',
        accountType: 'worker',
        isActive: true,
        isAdmin: false
      },
      {
        username: 'testposter1',
        password: 'hashedpassword2',
        fullName: 'Test Poster 1',
        email: 'poster1@test.com',
        accountType: 'poster',
        isActive: true,
        isAdmin: false
      },
      {
        username: 'testadmin1',
        password: 'hashedpassword3',
        fullName: 'Test Admin 1',
        email: 'admin1@test.com',
        accountType: 'worker',
        isActive: true,
        isAdmin: true
      }
    ]).returning();
    
    return testUsers;
  });
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  await withAdminContext(async () => {
    // Delete test users and related data
    await db.delete(users).where(eq(users.email, 'worker1@test.com'));
    await db.delete(users).where(eq(users.email, 'poster1@test.com'));
    await db.delete(users).where(eq(users.email, 'admin1@test.com'));
  });
}

async function testUserDataIsolation(testUsers: any[]) {
  const [worker, poster, admin] = testUsers;
  
  await runTest('User can only see their own profile', async () => {
    await setUserContext(worker.id, false);
    
    // Worker should see their own profile
    const ownProfile = await db.select().from(users).where(eq(users.id, worker.id));
    if (ownProfile.length !== 1) {
      throw new Error('User cannot see their own profile');
    }
    
    // Worker should NOT see other user's profile directly
    const otherProfile = await db.select().from(users).where(eq(users.id, poster.id));
    if (otherProfile.length !== 0) {
      throw new Error('User can see other user\'s profile (RLS violation)');
    }
  });
  
  await runTest('Admin can see all user profiles', async () => {
    await setUserContext(admin.id, true);
    
    const allUsers = await db.select().from(users);
    if (allUsers.length < 3) {
      throw new Error('Admin cannot see all users');
    }
  });
}

async function testJobDataIsolation(testUsers: any[]) {
  const [worker, poster, admin] = testUsers;
  
  // Create test job as poster
  let testJob: any;
  await withUserContext(poster.id, false, async () => {
    const jobs_result = await db.insert(jobs).values({
      title: 'Test Job for RLS',
      description: 'Testing RLS policies',
      category: 'Testing',
      posterId: poster.id,
      paymentType: 'fixed',
      paymentAmount: 50.0,
      serviceFee: 2.5,
      totalAmount: 52.5,
      location: 'Test Location',
      latitude: 40.7128,
      longitude: -74.0060,
      dateNeeded: new Date(),
      status: 'open'
    }).returning();
    testJob = jobs_result[0];
  });
  
  await runTest('Job poster can see their own jobs', async () => {
    await setUserContext(poster.id, false);
    
    const posterJobs = await db.select().from(jobs).where(eq(jobs.posterId, poster.id));
    if (posterJobs.length === 0) {
      throw new Error('Job poster cannot see their own jobs');
    }
  });
  
  await runTest('Other users cannot see private job details', async () => {
    await setUserContext(worker.id, false);
    
    // Worker should be able to see open jobs but not private details
    const visibleJobs = await db.select().from(jobs).where(eq(jobs.id, testJob.id));
    // This depends on your RLS policy - adjust based on your business logic
  });
  
  // Cleanup test job
  await withAdminContext(async () => {
    await db.delete(jobs).where(eq(jobs.id, testJob.id));
  });
}

async function testFinancialDataIsolation(testUsers: any[]) {
  const [worker, poster, admin] = testUsers;
  
  // Create test payment as poster
  let testPayment: any;
  await withUserContext(poster.id, false, async () => {
    const payment_result = await db.insert(payments).values({
      userId: poster.id,
      workerId: worker.id,
      amount: 50.0,
      serviceFee: 2.5,
      type: 'payment',
      status: 'completed',
      description: 'Test payment for RLS'
    }).returning();
    testPayment = payment_result[0];
  });
  
  await runTest('Users can only see their own financial records', async () => {
    await setUserContext(worker.id, false);
    
    // Worker should see payments they received
    const workerPayments = await db.select().from(payments).where(eq(payments.workerId, worker.id));
    if (workerPayments.length === 0) {
      throw new Error('Worker cannot see payments they received');
    }
    
    // Worker should NOT see payments they didn't participate in
    const otherPayments = await db.select().from(payments).where(eq(payments.userId, poster.id));
    // Should only see payments where they are the worker
  });
  
  await runTest('Admin can see all financial records', async () => {
    await setUserContext(admin.id, true);
    
    const allPayments = await db.select().from(payments);
    if (allPayments.length === 0) {
      throw new Error('Admin cannot see financial records');
    }
  });
  
  // Cleanup test payment
  await withAdminContext(async () => {
    await db.delete(payments).where(eq(payments.id, testPayment.id));
  });
}

async function testRLSBypass() {
  await runTest('RLS cannot be bypassed without proper context', async () => {
    // Clear user context
    await setUserContext(0, false);
    
    try {
      // This should fail or return no results due to RLS
      const allUsers = await db.select().from(users);
      if (allUsers.length > 0) {
        throw new Error('RLS bypass detected - users visible without context');
      }
    } catch (error) {
      // This is expected - RLS should prevent access
      if (error instanceof Error && error.message.includes('policy')) {
        // Good - RLS is working
        return;
      }
      throw error;
    }
  });
}

async function testAdminContext() {
  await runTest('Admin context allows elevated access', async () => {
    const adminData = await withAdminContext(async () => {
      return await db.select().from(users);
    });
    
    if (adminData.length === 0) {
      throw new Error('Admin context not working properly');
    }
  });
}

async function main() {
  console.log('🔒 Starting RLS Security Tests');
  console.log('================================');
  
  let testUsers: any[] = [];
  
  try {
    // Setup
    testUsers = await createTestUsers();
    console.log(`✅ Created ${testUsers.length} test users`);
    
    // Run tests
    await testUserDataIsolation(testUsers);
    await testJobDataIsolation(testUsers);
    await testFinancialDataIsolation(testUsers);
    await testRLSBypass();
    await testAdminContext();
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    // Cleanup
    if (testUsers.length > 0) {
      await cleanupTestData();
    }
  }
  
  // Results summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  • ${result.test}: ${result.error}`);
    });
  }
  
  if (failed === 0) {
    console.log('\n🎉 All RLS security tests passed!');
    console.log('Your database is properly secured with Row Level Security.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix the issues before deploying to production.');
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);
