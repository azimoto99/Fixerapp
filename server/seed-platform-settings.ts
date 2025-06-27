import { db } from './db';
import { platformSettings } from '../shared/schema';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultPlatformSettings = [
  // General Settings
  { key: 'platformName', value: 'Fixer', description: 'Name of the platform', category: 'general' },
  { key: 'supportEmail', value: 'support@fixer.com', description: 'Support contact email', category: 'general' },
  { key: 'maxFileSize', value: 10, description: 'Maximum file upload size in MB', category: 'general' },
  { key: 'sessionTimeout', value: 60, description: 'Session timeout in minutes', category: 'general' },
  { key: 'maintenanceMode', value: false, description: 'Enable maintenance mode', category: 'general' },
  { key: 'registrationEnabled', value: true, description: 'Allow new user registrations', category: 'general' },
  
  // Payment Settings
  { key: 'platformFee', value: 5.0, description: 'Platform fee percentage', category: 'payment' },
  { key: 'minPayout', value: 20, description: 'Minimum payout amount in USD', category: 'payment' },
  { key: 'maxJobValue', value: 10000, description: 'Maximum job value in USD', category: 'payment' },
  { key: 'paymentProcessingFee', value: 2.9, description: 'Payment processing fee percentage', category: 'payment' },
  { key: 'instantPayoutFee', value: 1.5, description: 'Instant payout fee percentage', category: 'payment' },
  
  // Security Settings
  { key: 'requireEmailVerification', value: true, description: 'Require email verification for new accounts', category: 'security' },
  { key: 'require2FA', value: false, description: 'Require 2FA for admin accounts', category: 'security' },
  { key: 'maxLoginAttempts', value: 5, description: 'Maximum login attempts before lockout', category: 'security' },
  { key: 'passwordMinLength', value: 8, description: 'Minimum password length', category: 'security' },
  { key: 'sessionSecure', value: true, description: 'Use secure session cookies', category: 'security' },
  
  // Moderation Settings
  { key: 'autoModerationEnabled', value: true, description: 'Enable automatic content moderation', category: 'moderation' },
  { key: 'profanityFilterEnabled', value: true, description: 'Enable profanity filter', category: 'moderation' },
  { key: 'imageModeration', value: true, description: 'Enable image content moderation', category: 'moderation' },
  { key: 'maxReportsBeforeReview', value: 3, description: 'Max reports before manual review', category: 'moderation' },
  
  // Notification Settings
  { key: 'emailNotificationsEnabled', value: true, description: 'Enable email notifications', category: 'notifications' },
  { key: 'smsNotificationsEnabled', value: false, description: 'Enable SMS notifications', category: 'notifications' },
  { key: 'pushNotificationsEnabled', value: true, description: 'Enable push notifications', category: 'notifications' },
  
  // Feature Flags
  { key: 'locationVerificationEnabled', value: true, description: 'Enable GPS location verification', category: 'features' },
  { key: 'enterpriseAccountsEnabled', value: true, description: 'Enable enterprise business accounts', category: 'features' },
  { key: 'hubPinsEnabled', value: true, description: 'Enable business hub pins', category: 'features' },
  { key: 'analyticsEnabled', value: true, description: 'Enable platform analytics', category: 'features' }
];

export async function seedPlatformSettings() {
  console.log('Seeding platform settings...');
  
  try {
    for (const setting of defaultPlatformSettings) {
      await db.insert(platformSettings).values({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        category: setting.category
      }).onConflictDoNothing();
    }
    
    console.log('Platform settings seeded successfully!');
  } catch (error) {
    console.error('Error seeding platform settings:', error);
    throw error;
  }
}

// Run if called directly
const isMainModule = process.argv[1] === __filename;
if (isMainModule) {
  seedPlatformSettings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
