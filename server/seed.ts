import { db } from './db';
import { users, jobs, platformSettings } from '@shared/schema';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { seedPlatformSettings } from './seed-platform-settings';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Global variable to prevent multiple concurrent executions
let seedingInProgress = false;

async function seedDatabase() {
  // Prevent multiple concurrent executions
  if (seedingInProgress) {
    console.log('Seeding already in progress, skipping...');
    return;
  }
  
  seedingInProgress = true;
  console.log('Seeding database...');
  
  try {
    // Check if we already have users and platform settings
    const [existingUsers, existingSettings] = await Promise.all([
      db.select({ id: users.id }).from(users).limit(1),
      db.select({ key: platformSettings.key }).from(platformSettings).limit(1)
    ]);
    
    if (existingUsers.length > 0 && existingSettings.length > 0) {
      console.log('Database already has data, skipping seed');
      return;
    }
    
    // If we have users but no platform settings, only seed platform settings
    if (existingUsers.length > 0 && existingSettings.length === 0) {
      console.log('Seeding only platform settings...');
      await seedPlatformSettings();
      console.log('Platform settings seeded successfully');
      return;
    }
  } catch (error) {
    console.error('Error checking database:', error);
    console.log('Will attempt to seed database anyway');
  }
  
  // Create some users
  const hashedPassword = await hashPassword('password123');
  
  const [worker1] = await db.insert(users).values({
    username: 'worker1',
    password: hashedPassword,
    fullName: 'Worker One',
    email: 'worker1@example.com',
    accountType: 'worker',
    skills: ['Cleaning', 'Organization', 'Driving'],
    bio: 'Experienced in cleaning and organization',
    avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    phone: '555-123-4567',
    isActive: true,
    lastActive: new Date(),
    rating: 0
  }).returning();
  
  const [poster1] = await db.insert(users).values({
    username: 'poster1',
    password: hashedPassword,
    fullName: 'Job Poster One',
    email: 'poster1@example.com',
    accountType: 'poster',
    skills: [],
    bio: 'Looking for help with various tasks',
    avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
    phone: '555-987-6543',
    isActive: true,
    lastActive: new Date(),
    rating: 0
  }).returning();
  
  // Create a second account for the same user with a different account type
  await db.insert(users).values({
    username: 'poster1_worker',
    password: hashedPassword,
    fullName: 'Job Poster One',
    email: 'poster1@example.com',
    accountType: 'worker',
    skills: ['Delivery', 'Driving', 'Tech Support'],
    bio: 'I can help with deliveries and tech support!',
    avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
    phone: '555-987-6543',
    isActive: true,
    lastActive: new Date(),
    rating: 0
  }).returning();
  
  // Create sample jobs
  const sampleLocation = {
    latitude: 37.7749,
    longitude: -122.4194
  };
  
  // Add a few jobs
  await db.insert(jobs).values({
    title: 'Lawn Mowing Service',
    description: 'Need help mowing my large backyard lawn. Equipment provided.',
    category: 'Home Maintenance',
    posterId: poster1.id,
    status: 'open',
    paymentType: 'hourly',
    paymentAmount: 35,
    serviceFee: 35 * 0.05,
    totalAmount: 35,
    location: '123 Main St',
    latitude: sampleLocation.latitude + 0.01,
    longitude: sampleLocation.longitude - 0.01,
    datePosted: new Date(),
    dateNeeded: new Date(Date.now() + 86400000), // Tomorrow
    requiredSkills: ['Gardening'],
    equipmentProvided: true
  });
  
  await db.insert(jobs).values({
    title: 'Package Delivery (5 items)',
    description: 'Need help delivering 5 small packages to addresses in the neighborhood.',
    category: 'Delivery',
    posterId: poster1.id,
    status: 'open',
    paymentType: 'fixed',
    paymentAmount: 50,
    serviceFee: 50 * 0.05,
    totalAmount: 50 + (50 * 0.05),
    location: '456 Oak St',
    latitude: sampleLocation.latitude - 0.015,
    longitude: sampleLocation.longitude + 0.02,
    datePosted: new Date(),
    dateNeeded: new Date(Date.now() + 172800000), // 2 days from now
    requiredSkills: ['Driving'],
    equipmentProvided: false
  });
  
  // Seed platform settings
  await seedPlatformSettings();
  
  console.log('Database seeded successfully');
}

// Seeding removed from automatic execution
// To run seeding manually, use: npm run db:seed or node server/seed.ts
// if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SEEDING === 'true') {
//   seedDatabase().catch(console.error);
// }