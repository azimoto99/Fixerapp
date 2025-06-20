import { storage } from '../server/storage';

async function seedTestData() {
  console.log('🌱 Seeding test data for admin panel...');

  try {
    // Create test users
    const testUsers = [
      {
        username: 'testworker1',
        email: 'worker1@test.com',
        fullName: 'Test Worker One',
        password: 'password123',
        accountType: 'worker' as const,
        isActive: true,
        isAdmin: false
      },
      {
        username: 'testposter1',
        email: 'poster1@test.com',
        fullName: 'Test Poster One',
        password: 'password123',
        accountType: 'poster' as const,
        isActive: true,
        isAdmin: false
      },
      {
        username: 'testadmin',
        email: 'admin@test.com',
        fullName: 'Test Admin',
        password: 'password123',
        accountType: 'poster' as const,
        isActive: true,
        isAdmin: true
      }
    ];

    console.log('Creating test users...');
    const createdUsers: any[] = [];
    for (const userData of testUsers) {
      const user = await storage.createUser(userData as any);
      if (user) {
        createdUsers.push(user);
        console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
      }
    }

    // Create test jobs
    if (createdUsers.length >= 2) {
      const posterId = createdUsers[1].id; // Use poster account
      const testJobs = [
        {
          title: 'Fix Kitchen Sink',
          description: 'Need someone to fix a leaky kitchen sink',
          category: 'plumbing',
          paymentType: 'fixed' as const,
          paymentAmount: 150,
          serviceFee: 7.5,
          totalAmount: 157.5,
          location: 'New York, NY',
          latitude: 40.7128,
          longitude: -74.0060,
          dateNeeded: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          requiredSkills: ['plumbing', 'tools'],
          equipmentProvided: false,
          posterId,
          status: 'open' as const,
          datePosted: new Date()
        },
        {
          title: 'Paint Living Room',
          description: 'Looking for someone to paint my living room walls',
          category: 'painting',
          paymentType: 'fixed' as const,
          paymentAmount: 300,
          serviceFee: 15,
          totalAmount: 315,
          location: 'Brooklyn, NY',
          latitude: 40.6782,
          longitude: -73.9442,
          dateNeeded: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          requiredSkills: ['painting', 'interior design'],
          equipmentProvided: true,
          posterId,
          status: 'open' as const,
          datePosted: new Date()
        },
        {
          title: 'Lawn Mowing Service',
          description: 'Weekly lawn mowing for the summer season',
          category: 'landscaping',
          paymentType: 'hourly' as const,
          paymentAmount: 25,
          serviceFee: 1.25,
          totalAmount: 26.25,
          location: 'Queens, NY',
          latitude: 40.7282,
          longitude: -73.7949,
          dateNeeded: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          requiredSkills: ['landscaping', 'lawn care'],
          equipmentProvided: false,
          posterId,
          status: 'in_progress' as const,
          datePosted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          workerId: createdUsers[0].id // Assign to worker
        }
      ];

      console.log('Creating test jobs...');
      for (const jobData of testJobs) {
        const job = await storage.createJob(jobData);
        if (job) {
          console.log(`✅ Created job: ${job.title} (ID: ${job.id})`);
        }
      }
    }

    // Create test support tickets
    if (createdUsers.length >= 1) {
      const userId = createdUsers[0].id;
      const testTickets = [
        {
          title: 'Cannot upload profile picture',
          description: 'Getting an error when trying to upload my profile picture',
          category: 'technical',
          priority: 'medium',
          status: 'open',
          userId,
          userName: createdUsers[0].fullName,
          userEmail: createdUsers[0].email,
          createdAt: new Date()
        },
        {
          title: 'Payment not received',
          description: 'Completed a job 3 days ago but payment has not been processed',
          category: 'billing',
          priority: 'high',
          status: 'in_progress',
          userId,
          userName: createdUsers[0].fullName,
          userEmail: createdUsers[0].email,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];

      console.log('Creating test support tickets...');
      for (const ticketData of testTickets) {
        try {
          const ticket = await storage.createSupportTicket(ticketData);
          if (ticket) {
            console.log(`✅ Created support ticket: ${ticket.title} (ID: ${ticket.id})`);
          }
        } catch (error) {
          console.log(`⚠️ Could not create support ticket (method may not exist): ${ticketData.title}`);
        }
      }
    }

    // Create test payments
    if (createdUsers.length >= 2) {
      const testPayments = [
        {
          userId: createdUsers[0].id,
          userEmail: createdUsers[0].email,
          amount: 150,
          serviceFee: 7.5,
          status: 'completed',
          description: 'Payment for kitchen sink repair',
          transactionId: 'txn_test_001',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          userId: createdUsers[1].id,
          userEmail: createdUsers[1].email,
          amount: 300,
          serviceFee: 15,
          status: 'pending',
          description: 'Payment for living room painting',
          transactionId: 'txn_test_002',
          createdAt: new Date()
        }
      ];

      console.log('Creating test payments...');
      for (const paymentData of testPayments) {
        try {
          const payment = await storage.createPayment(paymentData);
          if (payment) {
            console.log(`✅ Created payment: $${payment.amount} (ID: ${payment.id})`);
          }
        } catch (error) {
          console.log(`⚠️ Could not create payment: ${error}`);
        }
      }
    }

    console.log('🎉 Test data seeding completed!');
    console.log('');
    console.log('Test accounts created:');
    console.log('- Admin: admin@test.com / password123');
    console.log('- Worker: worker1@test.com / password123');
    console.log('- Poster: poster1@test.com / password123');
    console.log('');
    console.log('You can now test the admin panel with real data!');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  }
}

// Run the seeding if this file is executed directly
seedTestData().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Failed to seed test data:', error);
  process.exit(1);
});

export { seedTestData }; 